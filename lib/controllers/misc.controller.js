// Wishlist, contact messages, newsletter, smart trip planner and admin dashboard.
const db = require('../db');
const { HttpError } = require('../http');
const { requireFields, clean, newId, EMAIL_RE, now } = require('../utils');
const { PACKAGE_SELECT } = require('./packages.controller');

/* ----------------------------- Wishlist ----------------------------- */

function getWishlist({ user }) {
  return db.all(
    `${PACKAGE_SELECT} JOIN wishlist w ON w.package_id = p.id WHERE w.user_id = ? ORDER BY w.created_at DESC`,
    [user.id]
  );
}

async function toggleWishlist({ params, user }) {
  if (!(await db.get('SELECT id FROM packages WHERE id = ?', [params.id]))) {
    throw new HttpError(404, 'Package not found');
  }
  const { changes } = await db.run('DELETE FROM wishlist WHERE user_id = ? AND package_id = ?', [user.id, params.id]);
  const added = changes === 0;
  if (added) {
    await db.run('INSERT INTO wishlist (user_id, package_id, created_at) VALUES (?, ?, ?)', [user.id, params.id, now()]);
  }
  const rows = await db.all('SELECT package_id FROM wishlist WHERE user_id = ?', [user.id]);
  return { wishlist: rows.map((r) => r.packageId), added };
}

/* ------------------------- Contact & newsletter ------------------------- */

async function sendMessage({ body }) {
  requireFields(body, ['name', 'email', 'subject', 'message']);
  if (!EMAIL_RE.test(body.email)) throw new HttpError(400, 'Please enter a valid email address');
  await db.run(
    'INSERT INTO messages (id, name, email, subject, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [newId('m'), clean(body.name, 80), clean(body.email, 120).toLowerCase(), clean(body.subject, 150),
      clean(body.message, 2000), now()]
  );
  return { status: 201, data: { message: 'Thank you! Our travel expert will contact you within 24 hours.' } };
}

function listMessages() {
  return db.all('SELECT * FROM messages ORDER BY created_at DESC');
}

async function markMessageRead({ params }) {
  const { changes } = await db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [params.id]);
  if (!changes) throw new HttpError(404, 'Message not found');
  return db.get('SELECT * FROM messages WHERE id = ?', [params.id]);
}

async function deleteMessage({ params }) {
  const { changes } = await db.run('DELETE FROM messages WHERE id = ?', [params.id]);
  if (!changes) throw new HttpError(404, 'Message not found');
  return { message: 'Message deleted' };
}

async function subscribe({ body }) {
  const email = clean(body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
  await db.run('INSERT OR IGNORE INTO newsletter (email, created_at) VALUES (?, ?)', [email, now()]);
  return { message: 'Subscribed! Watch your inbox for exclusive travel deals.' };
}

/* ---------------------------- Trip planner ---------------------------- */
// Rule-based recommendation engine: scores every package against the traveller's
// budget, duration, interests and travel month, then explains each recommendation.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function monthInRange(bestTime, month) {
  if (!month || !bestTime) return false;
  const idx = MONTHS.indexOf(month);
  return bestTime.split(',').some((range) => {
    const [from, to] = range.split('-').map((s) => MONTHS.indexOf(s.trim()));
    if (from === -1) return false;
    const end = to === -1 ? from : to;
    return from <= end ? idx >= from && idx <= end : idx >= from || idx <= end;
  });
}

async function plan({ body }) {
  const budget = Number(body.budget) || 0;
  const travelers = Math.max(1, parseInt(body.travelers, 10) || 1);
  const days = Math.max(1, parseInt(body.days, 10) || 5);
  const interests = Array.isArray(body.interests) ? body.interests : [];
  const month = MONTHS.includes(body.month) ? body.month : '';
  const scope = ['India', 'International'].includes(body.scope) ? body.scope : 'Any';
  if (budget <= 0) throw new HttpError(400, 'Please enter your total budget');

  const rows = await db.all(
    `SELECT p.*, d.name AS destination, d.country, d.category, d.best_time, d.rating AS dest_rating
     FROM packages p JOIN destinations d ON d.id = p.destination_id`
  );

  const perPerson = budget / travelers;
  const recommendations = rows
    .filter((p) => scope === 'Any' || (scope === 'India') === (p.country === 'India'))
    .map((p) => {
      let score = 0;
      const reasons = [];

      if (p.price <= perPerson) { score += 40; reasons.push('Fits within your budget'); }
      else if (p.price <= perPerson * 1.15) { score += 15; reasons.push('Slightly above budget'); }
      else score -= 40;

      const dayGap = Math.abs(p.days - days);
      score += Math.max(0, 25 - dayGap * 6);
      if (dayGap <= 1) reasons.push(`Matches your ${days}-day trip length`);

      const matched = interests.filter((i) => i === p.category || i === p.type);
      if (matched.length) { score += 25; reasons.push(`Great for ${matched.join(' & ')} lovers`); }

      if (monthInRange(p.bestTime, month)) { score += 15; reasons.push(`${month} is a great time to visit`); }

      score += (p.destRating || 0) * 2;
      return { p, score, reasons };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ p, score, reasons }) => ({
      packageId: p.id,
      title: p.title,
      image: p.image,
      destination: p.destination,
      country: p.country,
      days: p.days,
      pricePerPerson: p.price,
      totalEstimate: Math.round(p.price * travelers * 1.05),
      matchScore: Math.min(99, Math.round(score)),
      reasons,
      itinerary: p.itinerary,
      bestTime: p.bestTime
    }));

  const tips = [
    `Your budget per traveller is about ₹${Math.round(perPerson).toLocaleString('en-IN')}.`,
    travelers >= 5
      ? 'You qualify for our 10% group discount on bookings of 5+ travellers.'
      : 'Book 5 or more travellers to unlock a 10% group discount.',
    'Book at least 3 weeks in advance for the best hotel availability.',
    'Keep 10-15% of your budget aside for shopping, tips and local food.'
  ];

  return { recommendations, tips, summary: { budget, travelers, days, interests, month, scope } };
}

/* ------------------------------- Admin ------------------------------- */

async function stats() {
  const [totals] = await db.all(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'user')      AS users,
      (SELECT COUNT(*) FROM destinations)                   AS destinations,
      (SELECT COUNT(*) FROM packages)                       AS packages,
      (SELECT COUNT(*) FROM bookings)                       AS bookings,
      (SELECT IFNULL(SUM(total), 0) FROM bookings
         WHERE status <> 'Cancelled' AND payment_status = 'Paid') AS revenue,
      (SELECT COUNT(*) FROM messages WHERE is_read = 0)     AS unread_messages,
      (SELECT COUNT(*) FROM newsletter)                     AS subscribers`);

  const counts = await db.all('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status');
  const statusCounts = ['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => ({
    status, count: counts.find((c) => c.status === status)?.count || 0
  }));

  const topPackages = await db.all(`
    SELECT package_title AS title, COUNT(*) AS count FROM bookings
    WHERE status <> 'Cancelled' GROUP BY package_id ORDER BY count DESC LIMIT 5`);

  const recentBookings = await db.all(`
    SELECT b.*, u.name AS user_name FROM bookings b JOIN users u ON u.id = b.user_id
    ORDER BY b.created_at DESC LIMIT 5`);

  return { totals, statusCounts, topPackages, recentBookings };
}

function listUsers() {
  return db.all(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
           (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS bookings
    FROM users u ORDER BY u.created_at DESC`);
}

module.exports = {
  getWishlist, toggleWishlist,
  sendMessage, listMessages, markMessageRead, deleteMessage, subscribe,
  plan, stats, listUsers
};
