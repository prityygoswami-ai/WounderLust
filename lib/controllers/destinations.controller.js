const db = require('../db');
const { HttpError } = require('../http');
const { requireFields, clean, toList, slugify } = require('../utils');
const { PACKAGE_SELECT } = require('./packages.controller');

const DESTINATION_SELECT = `
  SELECT d.*,
         (SELECT COUNT(*)   FROM packages p WHERE p.destination_id = d.id) AS package_count,
         (SELECT MIN(price) FROM packages p WHERE p.destination_id = d.id) AS starting_price
  FROM destinations d`;

async function list({ query }) {
  const where = [];
  const args = [];
  const q = clean(query.q, 80).toLowerCase();
  if (q) {
    where.push(`LOWER(d.name || ' ' || d.country || ' ' || IFNULL(d.region, '') || ' ' || d.category || ' ' || IFNULL(d.description, '')) LIKE ?`);
    args.push(`%${q}%`);
  }
  if (query.category && query.category !== 'All') {
    where.push('d.category = ?');
    args.push(query.category);
  }
  const sql = `${DESTINATION_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY d.rating DESC, d.name`;
  return db.all(sql, args);
}

async function getOne({ params }) {
  const destination = await db.get(`${DESTINATION_SELECT} WHERE d.id = ?`, [params.id]);
  if (!destination) throw new HttpError(404, 'Destination not found');
  const packages = await db.all(`${PACKAGE_SELECT} WHERE p.destination_id = ? ORDER BY p.price`, [params.id]);
  return { ...destination, packages };
}

async function create({ body }) {
  requireFields(body, ['name', 'country', 'category', 'description']);
  let id = slugify(body.name);
  if (!id) throw new HttpError(400, 'Invalid destination name');
  if (await db.get('SELECT id FROM destinations WHERE id = ?', [id])) id = `${id}-${Date.now().toString(36)}`;

  await db.run(
    `INSERT INTO destinations (id, name, country, region, category, image, description, best_time, rating, highlights)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, clean(body.name, 80), clean(body.country, 60), clean(body.region, 60), clean(body.category, 30),
      clean(body.image, 500), clean(body.description, 1000), clean(body.bestTime, 80),
      Math.min(5, Math.max(0, Number(body.rating) || 4.5)), JSON.stringify(toList(body.highlights))
    ]
  );
  return { status: 201, data: await db.get(`${DESTINATION_SELECT} WHERE d.id = ?`, [id]) };
}

async function remove({ params }) {
  const dest = await db.get('SELECT id FROM destinations WHERE id = ?', [params.id]);
  if (!dest) throw new HttpError(404, 'Destination not found');
  if (await db.get('SELECT id FROM packages WHERE destination_id = ? LIMIT 1', [params.id])) {
    throw new HttpError(409, 'Delete the packages of this destination first');
  }
  await db.run('DELETE FROM destinations WHERE id = ?', [params.id]);
  return { message: 'Destination deleted' };
}

module.exports = { list, getOne, create, remove };
