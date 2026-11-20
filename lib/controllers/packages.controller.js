const db = require('../db');
const { HttpError } = require('../http');
const { requireFields, clean, toList, slugify, newId, now } = require('../utils');

/** Package columns plus destination name, average rating, review count and remaining seats. */
const PACKAGE_SELECT = `
  SELECT p.*,
         d.name    AS destination_name,
         d.country AS country,
         IFNULL((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.package_id = p.id), 0) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.package_id = p.id) AS review_count,
         MAX(0, p.seats - IFNULL((SELECT SUM(b.travelers) FROM bookings b
                                  WHERE b.package_id = p.id AND b.status <> 'Cancelled'), 0)) AS seats_left
  FROM packages p
  JOIN destinations d ON d.id = p.destination_id`;

const SORTS = {
  'price-asc': 'p.price ASC',
  'price-desc': 'p.price DESC',
  duration: 'p.days ASC',
  rating: 'rating DESC'
};

function findPackage(id) {
  return db.get(`${PACKAGE_SELECT} WHERE p.id = ?`, [id]);
}

function getReviews(packageId) {
  return db.all(
    `SELECT r.id, r.user_id, u.name AS user_name, r.rating, r.comment, r.created_at
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.package_id = ? ORDER BY r.created_at DESC`,
    [packageId]
  );
}

async function list({ query }) {
  const where = [];
  const args = [];
  const q = clean(query.q, 80).toLowerCase();
  if (q) {
    where.push(`LOWER(p.title || ' ' || d.name || ' ' || d.country || ' ' || p.type) LIKE ?`);
    args.push(`%${q}%`);
  }
  if (query.destination) { where.push('p.destination_id = ?'); args.push(query.destination); }
  if (query.type && query.type !== 'All') { where.push('p.type = ?'); args.push(query.type); }
  if (query.minPrice) { where.push('p.price >= ?'); args.push(Number(query.minPrice)); }
  if (query.maxPrice) { where.push('p.price <= ?'); args.push(Number(query.maxPrice)); }
  if (query.maxDays) { where.push('p.days <= ?'); args.push(Number(query.maxDays)); }
  if (query.featured === 'true') where.push('p.featured = 1');

  const sql = `${PACKAGE_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${SORTS[query.sort] || 'p.featured DESC, rating DESC, p.price ASC'}`;
  return db.all(sql, args);
}

async function getOne({ params }) {
  const pkg = await findPackage(params.id);
  if (!pkg) throw new HttpError(404, 'Package not found');
  return { ...pkg, reviews: await getReviews(pkg.id) };
}

/** Validate admin input and return column values for INSERT/UPDATE. */
async function buildPackage(body, existing = {}) {
  requireFields(body, ['title', 'destinationId', 'days', 'price']);
  if (!(await db.get('SELECT id FROM destinations WHERE id = ?', [body.destinationId]))) {
    throw new HttpError(400, 'Invalid destination');
  }
  const days = Math.max(1, parseInt(body.days, 10) || 1);
  const price = Math.round(Number(body.price));
  if (!(price > 0)) throw new HttpError(400, 'Price must be a positive number');

  // Itinerary may arrive as text lines ("Title: description") or as an array of {title, desc} objects.
  const lines = Array.isArray(body.itinerary)
    ? body.itinerary
        .map((d) => (d && typeof d === 'object' ? `${clean(d.title, 120)}: ${clean(d.desc, 500)}` : clean(d, 600)))
        .filter((line) => line.replace(':', '').trim())
    : String(body.itinerary ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const itinerary = lines.length
    ? lines.map((line, i) => {
        const [title, ...rest] = line.split(':');
        return rest.length
          ? { title: title.trim(), desc: rest.join(':').trim() }
          : { title: `Day ${i + 1}`, desc: line };
      })
    : existing.itinerary || [];

  return {
    title: clean(body.title, 120),
    destination_id: body.destinationId,
    days,
    nights: days - 1,
    price,
    image: clean(body.image, 500) || existing.image || '',
    type: clean(body.type, 30) || 'Leisure',
    seats: Math.max(1, parseInt(body.seats, 10) || 20),
    featured: body.featured === true || body.featured === 'true' || body.featured === 'on' ? 1 : 0,
    inclusions: JSON.stringify(toList(body.inclusions)),
    itinerary: JSON.stringify(itinerary)
  };
}

async function create({ body }) {
  const values = await buildPackage(body);
  let id = slugify(body.title);
  if (!id) throw new HttpError(400, 'Invalid package title');
  if (await db.get('SELECT id FROM packages WHERE id = ?', [id])) id = `${id}-${Date.now().toString(36)}`;

  const cols = Object.keys(values);
  await db.run(
    `INSERT INTO packages (id, ${cols.join(', ')}, created_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?)`,
    [id, ...Object.values(values), now()]
  );
  return { status: 201, data: await findPackage(id) };
}

async function update({ params, body }) {
  const existing = await findPackage(params.id);
  if (!existing) throw new HttpError(404, 'Package not found');
  const values = await buildPackage(body, existing);
  await db.run(
    `UPDATE packages SET ${Object.keys(values).map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(values), params.id]
  );
  return findPackage(params.id);
}

async function remove({ params }) {
  if (!(await db.get('SELECT id FROM packages WHERE id = ?', [params.id]))) {
    throw new HttpError(404, 'Package not found');
  }
  const active = await db.get(
    `SELECT id FROM bookings WHERE package_id = ? AND status IN ('Pending', 'Confirmed') LIMIT 1`,
    [params.id]
  );
  if (active) throw new HttpError(409, 'This package has active bookings. Cancel or complete them before deleting.');

  await db.transaction([
    { sql: 'DELETE FROM reviews WHERE package_id = ?', args: [params.id] },
    { sql: 'DELETE FROM wishlist WHERE package_id = ?', args: [params.id] },
    { sql: 'DELETE FROM packages WHERE id = ?', args: [params.id] }
  ]);
  return { message: 'Package deleted' };
}

async function addReview({ params, body, user }) {
  if (!(await db.get('SELECT id FROM packages WHERE id = ?', [params.id]))) {
    throw new HttpError(404, 'Package not found');
  }
  const rating = parseInt(body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Rating must be between 1 and 5');
  const comment = clean(body.comment, 600);
  if (comment.length < 3) throw new HttpError(400, 'Please write a short comment');
  if (await db.get('SELECT id FROM reviews WHERE package_id = ? AND user_id = ?', [params.id, user.id])) {
    throw new HttpError(409, 'You have already reviewed this package');
  }

  await db.run(
    'INSERT INTO reviews (id, package_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [newId('r'), params.id, user.id, rating, comment, now()]
  );
  const pkg = await findPackage(params.id);
  return { status: 201, data: { rating: pkg.rating, reviews: await getReviews(params.id) } };
}

module.exports = { PACKAGE_SELECT, findPackage, list, getOne, create, update, remove, addReview };
