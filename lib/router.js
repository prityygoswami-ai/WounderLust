// Central API router. Used by both the Vercel function (api/index.js) and the local server (server.js).
const db = require('./db');
const { HttpError, sendJson, readBody } = require('./http');
const { verifyToken } = require('./auth');

const authCtrl = require('./controllers/auth.controller');
const destCtrl = require('./controllers/destinations.controller');
const pkgCtrl = require('./controllers/packages.controller');
const bookingCtrl = require('./controllers/bookings.controller');
const misc = require('./controllers/misc.controller');

// access: 'public' | 'user' (any logged-in user) | 'admin'
const routes = [
  ['GET', '/health', 'public', async () => {
    await db.init();
    return { status: 'ok', database: 'SQLite', storage: db.storage, time: new Date().toISOString() };
  }],

  ['POST', '/auth/register', 'public', authCtrl.register],
  ['POST', '/auth/login', 'public', authCtrl.login],
  ['GET', '/auth/me', 'user', authCtrl.me],
  ['PUT', '/auth/me', 'user', authCtrl.updateProfile],

  ['GET', '/destinations', 'public', destCtrl.list],
  ['GET', '/destinations/:id', 'public', destCtrl.getOne],
  ['POST', '/destinations', 'admin', destCtrl.create],
  ['DELETE', '/destinations/:id', 'admin', destCtrl.remove],

  ['GET', '/packages', 'public', pkgCtrl.list],
  ['GET', '/packages/:id', 'public', pkgCtrl.getOne],
  ['POST', '/packages', 'admin', pkgCtrl.create],
  ['PUT', '/packages/:id', 'admin', pkgCtrl.update],
  ['DELETE', '/packages/:id', 'admin', pkgCtrl.remove],
  ['POST', '/packages/:id/reviews', 'user', pkgCtrl.addReview],

  ['POST', '/bookings', 'user', bookingCtrl.create],
  ['GET', '/bookings', 'user', bookingCtrl.listMine],
  ['GET', '/bookings/:id', 'user', bookingCtrl.getOne],
  ['POST', '/bookings/:id/cancel', 'user', bookingCtrl.cancel],

  ['GET', '/wishlist', 'user', misc.getWishlist],
  ['POST', '/wishlist/:id', 'user', misc.toggleWishlist],

  ['POST', '/contact', 'public', misc.sendMessage],
  ['POST', '/newsletter', 'public', misc.subscribe],
  ['POST', '/planner', 'public', misc.plan],

  ['GET', '/admin/stats', 'admin', misc.stats],
  ['GET', '/admin/users', 'admin', misc.listUsers],
  ['GET', '/admin/bookings', 'admin', bookingCtrl.listAll],
  ['PATCH', '/admin/bookings/:id', 'admin', bookingCtrl.updateStatus],
  ['GET', '/admin/messages', 'admin', misc.listMessages],
  ['PATCH', '/admin/messages/:id', 'admin', misc.markMessageRead],
  ['DELETE', '/admin/messages/:id', 'admin', misc.deleteMessage],
  ['POST', '/admin/reset', 'admin', async () => {
    await db.reset();
    return { message: 'Database reset to demo data' };
  }]
].map(([method, pattern, access, handler]) => ({
  method,
  access,
  handler,
  keys: (pattern.match(/:(\w+)/g) || []).map((k) => k.slice(1)),
  regex: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '/?$')
}));

function resolvePath(req) {
  const url = new URL(req.url, 'http://localhost');
  const rewritten = url.searchParams.get('__path'); // set by vercel.json rewrite
  url.searchParams.delete('__path');
  const pathname = rewritten !== null ? '/' + rewritten : url.pathname.replace(/^\/api/, '');
  return { path: decodeURIComponent(pathname).replace(/\/+$/, '') || '/', query: Object.fromEntries(url.searchParams) };
}

async function handle(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const { path, query } = resolvePath(req);
    const candidates = routes.filter((r) => r.regex.test(path));
    if (!candidates.length) throw new HttpError(404, `API route not found: ${path}`);
    const route = candidates.find((r) => r.method === req.method);
    if (!route) throw new HttpError(405, 'Method not allowed');

    const params = {};
    const match = path.match(route.regex);
    route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });

    let user = null;
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const payload = verifyToken(token);
    if (payload) user = await authCtrl.findUserById(payload.id);

    if (route.access !== 'public' && !user) throw new HttpError(401, 'Please log in to continue');
    if (route.access === 'admin' && user.role !== 'admin') throw new HttpError(403, 'Admin access required');

    const body = await readBody(req);
    const result = await route.handler({ user, params, query, body: body || {} });

    if (result && typeof result === 'object' && 'status' in result && 'data' in result) {
      return sendJson(res, result.status, result.data);
    }
    return sendJson(res, 200, result);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    return sendJson(res, status, { error: status === 500 ? 'Internal server error' : err.message });
  }
}

module.exports = { handle };
