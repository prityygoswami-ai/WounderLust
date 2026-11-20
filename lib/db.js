// SQLite database layer (libSQL client).
//  - Local:   SQLite file at data/wanderlust.db (override with DATABASE_FILE)
//  - Vercel:  Turso cloud SQLite when TURSO_DATABASE_URL is set (permanent),
//             otherwise a SQLite file in /tmp (temporary, resets on cold start).
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');
const { destinations, packages } = require('./seed');
const { hashPassword } = require('./auth');

/* ------------------------------ Connection ------------------------------ */

function resolveUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const file = process.env.DATABASE_FILE
    || (process.env.VERCEL ? '/tmp/wanderlust.db' : path.join(__dirname, '..', 'data', 'wanderlust.db'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // libSQL expects a URL; encode spaces etc. and use forward slashes on Windows.
  return 'file:' + encodeURI(file.replace(/\\/g, '/'));
}

const client = createClient({ url: resolveUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
const storage = process.env.TURSO_DATABASE_URL ? 'turso-sqlite' : 'sqlite-file';

/* -------------------------------- Schema -------------------------------- */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id          TEXT PRIMARY KEY,
     name        TEXT NOT NULL,
     email       TEXT NOT NULL UNIQUE,
     phone       TEXT,
     password    TEXT NOT NULL,
     role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
     created_at  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS destinations (
     id           TEXT PRIMARY KEY,
     name         TEXT NOT NULL,
     country      TEXT NOT NULL,
     region       TEXT,
     category     TEXT NOT NULL,
     image        TEXT,
     description  TEXT,
     best_time    TEXT,
     rating       REAL DEFAULT 4.5,
     highlights   TEXT NOT NULL DEFAULT '[]'
   )`,
  `CREATE TABLE IF NOT EXISTS packages (
     id              TEXT PRIMARY KEY,
     title           TEXT NOT NULL,
     destination_id  TEXT NOT NULL REFERENCES destinations(id),
     days            INTEGER NOT NULL,
     nights          INTEGER NOT NULL,
     price           INTEGER NOT NULL CHECK (price > 0),
     image           TEXT,
     type            TEXT NOT NULL,
     seats           INTEGER NOT NULL,
     featured        INTEGER NOT NULL DEFAULT 0,
     inclusions      TEXT NOT NULL DEFAULT '[]',
     itinerary       TEXT NOT NULL DEFAULT '[]',
     created_at      TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS reviews (
     id          TEXT PRIMARY KEY,
     package_id  TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
     comment     TEXT NOT NULL,
     created_at  TEXT NOT NULL,
     UNIQUE (package_id, user_id)
   )`,
  `CREATE TABLE IF NOT EXISTS bookings (
     id                TEXT PRIMARY KEY,
     ref               TEXT NOT NULL UNIQUE,
     user_id           TEXT NOT NULL REFERENCES users(id),
     package_id        TEXT NOT NULL,
     package_title     TEXT NOT NULL,
     package_image     TEXT,
     days              INTEGER NOT NULL,
     travel_date       TEXT NOT NULL,
     travelers         INTEGER NOT NULL,
     contact_name      TEXT NOT NULL,
     contact_phone     TEXT NOT NULL,
     special_requests  TEXT,
     payment_method    TEXT NOT NULL,
     payment_status    TEXT NOT NULL,
     status            TEXT NOT NULL,
     subtotal          INTEGER NOT NULL,
     discount          INTEGER NOT NULL,
     taxes             INTEGER NOT NULL,
     total             INTEGER NOT NULL,
     created_at        TEXT NOT NULL,
     cancelled_at      TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS wishlist (
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     package_id  TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
     created_at  TEXT NOT NULL,
     PRIMARY KEY (user_id, package_id)
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id          TEXT PRIMARY KEY,
     name        TEXT NOT NULL,
     email       TEXT NOT NULL,
     subject     TEXT NOT NULL,
     message     TEXT NOT NULL,
     is_read     INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS newsletter (
     email       TEXT PRIMARY KEY,
     created_at  TEXT NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS idx_packages_destination ON packages(destination_id)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_package ON bookings(package_id)',
  'CREATE INDEX IF NOT EXISTS idx_reviews_package ON reviews(package_id)'
];

const TABLES = ['wishlist', 'reviews', 'bookings', 'messages', 'newsletter', 'packages', 'destinations', 'users'];

/* ------------------------------ Row helpers ------------------------------ */

const JSON_COLUMNS = new Set(['highlights', 'inclusions', 'itinerary']);
const BOOL_COLUMNS = new Set(['featured', 'is_read']);
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/** Convert a result row into a plain camelCase object, decoding JSON & boolean columns. */
function mapRow(columns, row) {
  const obj = {};
  columns.forEach((col, i) => {
    let value = row[i];
    if (JSON_COLUMNS.has(col)) value = value ? JSON.parse(value) : [];
    else if (BOOL_COLUMNS.has(col)) value = Boolean(value);
    obj[col === 'is_read' ? 'read' : camel(col)] = value;
  });
  return obj;
}

/* ------------------------------ Query API ------------------------------ */

let ready = null;

/** Create tables and seed demo data once per process. */
function init() {
  if (!ready) {
    ready = (async () => {
      await client.execute('PRAGMA foreign_keys = ON');
      await client.batch(SCHEMA, 'write');
      const { rows } = await client.execute('SELECT COUNT(*) AS n FROM destinations');
      if (Number(rows[0][0]) === 0) await seed();
    })().catch((err) => {
      ready = null; // allow retry on next request
      throw err;
    });
  }
  return ready;
}

async function all(sql, args = []) {
  await init();
  const rs = await client.execute({ sql, args });
  return rs.rows.map((row) => mapRow(rs.columns, row));
}

async function get(sql, args = []) {
  return (await all(sql, args))[0] || null;
}

async function run(sql, args = []) {
  await init();
  const rs = await client.execute({ sql, args });
  return { changes: rs.rowsAffected };
}

/** Run several statements atomically. Each item: { sql, args }. */
async function transaction(statements) {
  await init();
  return client.batch(statements, 'write');
}

/* -------------------------------- Seeding -------------------------------- */

async function seed() {
  const now = new Date().toISOString();
  const statements = [
    {
      sql: 'INSERT INTO users (id, name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['u_admin', 'Portal Admin', 'admin@wanderlust.com', '9999999999',
        hashPassword(process.env.ADMIN_PASSWORD || 'admin123'), 'admin', now]
    },
    ...destinations.map((d) => ({
      sql: `INSERT INTO destinations (id, name, country, region, category, image, description, best_time, rating, highlights)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [d.id, d.name, d.country, d.region, d.category, d.image, d.description, d.bestTime, d.rating,
        JSON.stringify(d.highlights)]
    })),
    ...packages.map((p) => ({
      sql: `INSERT INTO packages (id, title, destination_id, days, nights, price, image, type, seats, featured,
              inclusions, itinerary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.title, p.destinationId, p.days, p.nights, p.price, p.image, p.type, p.seats,
        p.featured ? 1 : 0, JSON.stringify(p.inclusions), JSON.stringify(p.itinerary), now]
    }))
  ];
  await client.batch(statements, 'write');
}

/** Drop everything and restore the demo data. */
async function reset() {
  await init();
  await client.batch(TABLES.map((t) => `DELETE FROM ${t}`), 'write');
  await seed();
}

module.exports = { all, get, run, transaction, init, reset, storage };
