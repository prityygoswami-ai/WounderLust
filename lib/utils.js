// Small validation and formatting helpers.
const crypto = require('crypto');
const { HttpError } = require('./http');

const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;

const slugify = (text) =>
  String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[0-9\s-]{7,15}$/;

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

/** Accept an array or a newline/comma separated string and return a clean string array. */
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => clean(v, 200)).filter(Boolean);
  return String(value ?? '').split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
}

function bookingRef() {
  return 'WL' + Date.now().toString(36).toUpperCase().slice(-5) + crypto.randomBytes(2).toString('hex').toUpperCase();
}

const now = () => new Date().toISOString();

module.exports = { newId, slugify, EMAIL_RE, PHONE_RE, requireFields, clean, toList, bookingRef, now };
