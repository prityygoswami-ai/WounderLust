const db = require('../db');
const { HttpError } = require('../http');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { newId, requireFields, clean, EMAIL_RE, PHONE_RE, now } = require('../utils');

/** Load a user (including password hash) by id. Used by the router to authenticate requests. */
function findUserById(id) {
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

/** Strip the password and attach the wishlist package ids. */
async function publicUser(user) {
  const { password, ...rest } = user;
  const rows = await db.all('SELECT package_id FROM wishlist WHERE user_id = ?', [user.id]);
  return { ...rest, wishlist: rows.map((r) => r.packageId) };
}

async function register({ body }) {
  requireFields(body, ['name', 'email', 'password']);
  const email = clean(body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
  if (String(body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (body.phone && !PHONE_RE.test(body.phone)) throw new HttpError(400, 'Please enter a valid phone number');
  if (await db.get('SELECT id FROM users WHERE email = ?', [email])) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const id = newId('u');
  await db.run(
    'INSERT INTO users (id, name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, clean(body.name, 80), email, clean(body.phone, 20), hashPassword(String(body.password)), 'user', now()]
  );
  const user = await findUserById(id);
  return { status: 201, data: { token: signToken({ id, role: user.role }), user: await publicUser(user) } };
}

async function login({ body }) {
  requireFields(body, ['email', 'password']);
  const user = await db.get('SELECT * FROM users WHERE email = ?', [clean(body.email, 120).toLowerCase()]);
  if (!user || !verifyPassword(String(body.password), user.password)) {
    throw new HttpError(401, 'Invalid email or password');
  }
  return { token: signToken({ id: user.id, role: user.role }), user: await publicUser(user) };
}

async function me({ user }) {
  return { user: await publicUser(user) };
}

async function updateProfile({ user, body }) {
  const name = body.name !== undefined ? clean(body.name, 80) || user.name : user.name;
  let phone = user.phone;
  if (body.phone !== undefined) {
    if (body.phone && !PHONE_RE.test(body.phone)) throw new HttpError(400, 'Please enter a valid phone number');
    phone = clean(body.phone, 20);
  }
  let password = user.password;
  if (body.newPassword) {
    if (!verifyPassword(String(body.currentPassword || ''), user.password)) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    if (String(body.newPassword).length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
    password = hashPassword(String(body.newPassword));
  }

  await db.run('UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?', [name, phone, password, user.id]);
  return { user: await publicUser(await findUserById(user.id)) };
}

module.exports = { register, login, me, updateProfile, findUserById };
