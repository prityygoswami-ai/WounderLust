const db = require('../db');
const { HttpError } = require('../http');
const { requireFields, clean, newId, bookingRef, PHONE_RE, now } = require('../utils');
const { findPackage } = require('./packages.controller');

const STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Pay at Office'];
const TAX_RATE = 0.05;        // 5% GST on tour packages
const GROUP_SIZE = 5;         // travellers needed for the group discount
const GROUP_DISCOUNT = 0.1;   // 10%

const BOOKING_SELECT = `
  SELECT b.*, u.name AS user_name, u.email AS user_email
  FROM bookings b
  JOIN users u ON u.id = b.user_id`;

function quote(price, travelers) {
  const subtotal = price * travelers;
  const discount = travelers >= GROUP_SIZE ? Math.round(subtotal * GROUP_DISCOUNT) : 0;
  const taxes = Math.round((subtotal - discount) * TAX_RATE);
  return { subtotal, discount, taxes, total: subtotal - discount + taxes };
}

function findBooking(idOrRef) {
  return db.get(`${BOOKING_SELECT} WHERE b.id = ? OR b.ref = ?`, [idOrRef, idOrRef]);
}

async function create({ body, user }) {
  requireFields(body, ['packageId', 'travelDate', 'travelers', 'contactName', 'contactPhone', 'paymentMethod']);
  const pkg = await findPackage(body.packageId);
  if (!pkg) throw new HttpError(404, 'Package not found');

  const travelers = parseInt(body.travelers, 10);
  if (!(travelers >= 1 && travelers <= 20)) throw new HttpError(400, 'Travelers must be between 1 and 20');
  if (travelers > pkg.seatsLeft) throw new HttpError(409, `Only ${pkg.seatsLeft} seat(s) left`);

  const travelDate = new Date(body.travelDate);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (Number.isNaN(travelDate.getTime()) || travelDate < tomorrow) {
    throw new HttpError(400, 'Travel date must be a future date (from tomorrow onwards)');
  }
  if (!PHONE_RE.test(body.contactPhone)) throw new HttpError(400, 'Please enter a valid phone number');
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) throw new HttpError(400, 'Invalid payment method');

  const paid = body.paymentMethod !== 'Pay at Office';
  const price = quote(pkg.price, travelers);
  const id = newId('b');

  await db.run(
    `INSERT INTO bookings (id, ref, user_id, package_id, package_title, package_image, days, travel_date, travelers,
       contact_name, contact_phone, special_requests, payment_method, payment_status, status,
       subtotal, discount, taxes, total, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, bookingRef(), user.id, pkg.id, pkg.title, pkg.image, pkg.days, travelDate.toISOString().slice(0, 10), travelers,
      clean(body.contactName, 80), clean(body.contactPhone, 20), clean(body.specialRequests, 500),
      body.paymentMethod, paid ? 'Paid' : 'Unpaid', paid ? 'Confirmed' : 'Pending',
      price.subtotal, price.discount, price.taxes, price.total, now()
    ]
  );
  return { status: 201, data: await findBooking(id) };
}

function listMine({ user }) {
  return db.all(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.created_at DESC`, [user.id]);
}

function listAll({ query }) {
  if (query.status && query.status !== 'All') {
    return db.all(`${BOOKING_SELECT} WHERE b.status = ? ORDER BY b.created_at DESC`, [query.status]);
  }
  return db.all(`${BOOKING_SELECT} ORDER BY b.created_at DESC`);
}

async function getOne({ params, user }) {
  const booking = await findBooking(params.id);
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (booking.userId !== user.id && user.role !== 'admin') throw new HttpError(403, 'Not allowed');
  return booking;
}

async function cancel({ params, user }) {
  const booking = await getOne({ params, user });
  if (booking.status === 'Cancelled') throw new HttpError(400, 'Booking is already cancelled');
  if (booking.status === 'Completed') throw new HttpError(400, 'Completed trips cannot be cancelled');

  await db.run(
    `UPDATE bookings SET status = 'Cancelled', cancelled_at = ?,
       payment_status = CASE WHEN payment_status = 'Paid' THEN 'Refund Initiated' ELSE payment_status END
     WHERE id = ?`,
    [now(), booking.id]
  );
  return findBooking(booking.id);
}

async function updateStatus({ params, body }) {
  const booking = await findBooking(params.id);
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (!STATUSES.includes(body.status)) throw new HttpError(400, `Status must be one of: ${STATUSES.join(', ')}`);

  let paymentStatus = booking.paymentStatus;
  if (['Confirmed', 'Completed'].includes(body.status) && paymentStatus === 'Unpaid') paymentStatus = 'Paid';
  if (body.status === 'Cancelled' && paymentStatus === 'Paid') paymentStatus = 'Refund Initiated';

  await db.run(
    'UPDATE bookings SET status = ?, payment_status = ?, cancelled_at = ? WHERE id = ?',
    [body.status, paymentStatus, body.status === 'Cancelled' ? now() : null, booking.id]
  );
  return findBooking(booking.id);
}

module.exports = { create, listMine, listAll, getOne, cancel, updateStatus, quote };
