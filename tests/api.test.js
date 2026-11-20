// End-to-end API test. Starts the local server on a random port with a temporary database
// and walks through the main user and admin flows.
// Run:  npm test
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}/api`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-test-'));

let passed = 0;
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    console.error(`  ✘ ${name}\n    ${err.message}`);
    throw err;
  }
}

async function call(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
}

// Use a throw-away SQLite file so the test never touches the real data/wanderlust.db.
async function startServer() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT, DATABASE_FILE: path.join(tmpDir, 'test.db') }
  });
  server.stderr.on('data', (d) => process.stderr.write(d));
  await new Promise((resolve) => server.stdout.once('data', resolve));
  return server;
}

async function stopServer(server) {
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await exited;
}

async function main() {
  let server = await startServer();

  const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  let userToken, adminToken, bookingId;

  try {
    console.log('Wanderlust API tests');

    await step('health check', async () => {
      const r = await call('GET', '/health');
      assert.strictEqual(r.status, 200);
    });

    await step('list & filter destinations', async () => {
      const all = await call('GET', '/destinations');
      assert.ok(all.data.length >= 10);
      const beach = await call('GET', '/destinations?category=Beach');
      assert.ok(beach.data.every((d) => d.category === 'Beach'));
    });

    await step('list, search & sort packages', async () => {
      const r = await call('GET', '/packages?q=goa&sort=price-asc');
      assert.ok(r.data.length >= 1 && r.data[0].destinationId === 'goa');
      const cheap = await call('GET', '/packages?maxPrice=15000');
      assert.ok(cheap.data.every((p) => p.price <= 15000));
    });

    await step('package detail & 404', async () => {
      assert.strictEqual((await call('GET', '/packages/goa-beach-escape')).status, 200);
      assert.strictEqual((await call('GET', '/packages/nope')).status, 404);
    });

    await step('register validation & success', async () => {
      assert.strictEqual((await call('POST', '/auth/register', { name: 'A', email: 'bad', password: '123456' })).status, 400);
      const r = await call('POST', '/auth/register', { name: 'Test User', email: 'test@example.com', password: 'secret12', phone: '9876543210' });
      assert.strictEqual(r.status, 201);
      userToken = r.data.token;
      assert.strictEqual((await call('POST', '/auth/register', { name: 'X', email: 'test@example.com', password: 'secret12' })).status, 409);
    });

    await step('login (user & admin) and wrong password', async () => {
      assert.strictEqual((await call('POST', '/auth/login', { email: 'test@example.com', password: 'wrong' })).status, 401);
      const admin = await call('POST', '/auth/login', { email: 'admin@wanderlust.com', password: 'admin123' });
      assert.strictEqual(admin.status, 200);
      adminToken = admin.data.token;
    });

    await step('protected routes require login / admin', async () => {
      assert.strictEqual((await call('GET', '/bookings')).status, 401);
      assert.strictEqual((await call('GET', '/admin/stats', null, userToken)).status, 403);
    });

    await step('create booking with group discount', async () => {
      const r = await call('POST', '/bookings', {
        packageId: 'goa-beach-escape', travelDate: future, travelers: 5,
        contactName: 'Test User', contactPhone: '9876543210', paymentMethod: 'UPI'
      }, userToken);
      assert.strictEqual(r.status, 201, JSON.stringify(r.data));
      assert.strictEqual(r.data.discount, Math.round(14999 * 5 * 0.1));
      assert.strictEqual(r.data.status, 'Confirmed');
      bookingId = r.data.id;
    });

    await step('reject booking with past date', async () => {
      const r = await call('POST', '/bookings', {
        packageId: 'goa-beach-escape', travelDate: '2020-01-01', travelers: 1,
        contactName: 'T', contactPhone: '9876543210', paymentMethod: 'UPI'
      }, userToken);
      assert.strictEqual(r.status, 400);
    });

    await step('my bookings & cancel', async () => {
      const mine = await call('GET', '/bookings', null, userToken);
      assert.strictEqual(mine.data.length, 1);
      const c = await call('POST', `/bookings/${bookingId}/cancel`, null, userToken);
      assert.strictEqual(c.data.status, 'Cancelled');
      assert.strictEqual(c.data.paymentStatus, 'Refund Initiated');
    });

    await step('wishlist toggle', async () => {
      const add = await call('POST', '/wishlist/bali-bliss', null, userToken);
      assert.ok(add.data.added);
      const list = await call('GET', '/wishlist', null, userToken);
      assert.strictEqual(list.data[0].id, 'bali-bliss');
    });

    await step('reviews update rating', async () => {
      const r = await call('POST', '/packages/bali-bliss/reviews', { rating: 4, comment: 'Lovely trip!' }, userToken);
      assert.strictEqual(r.status, 201);
      assert.strictEqual(r.data.rating, 4);
      assert.strictEqual((await call('POST', '/packages/bali-bliss/reviews', { rating: 5, comment: 'Again' }, userToken)).status, 409);
    });

    await step('smart trip planner', async () => {
      const r = await call('POST', '/planner', { budget: 40000, travelers: 2, days: 4, interests: ['Beach'], month: 'December', scope: 'India' });
      assert.ok(r.data.recommendations.length > 0);
      assert.ok(r.data.recommendations.every((x) => x.country === 'India'));
    });

    await step('contact & newsletter', async () => {
      assert.strictEqual((await call('POST', '/contact', { name: 'A', email: 'a@b.com', subject: 'Hi', message: 'Hello' })).status, 201);
      assert.strictEqual((await call('POST', '/newsletter', { email: 'a@b.com' })).status, 200);
    });

    await step('admin: stats, create/update/delete package, booking status', async () => {
      const stats = await call('GET', '/admin/stats', null, adminToken);
      assert.strictEqual(stats.data.totals.users, 1);
      const created = await call('POST', '/packages', {
        title: 'Test Package', destinationId: 'goa', days: 2, price: 5000, seats: 10,
        inclusions: 'Hotel\nBreakfast', itinerary: 'Arrive: check in\nLeave: go home'
      }, adminToken);
      assert.strictEqual(created.status, 201);
      assert.strictEqual(created.data.itinerary[0].title, 'Arrive');
      const updated = await call('PUT', `/packages/${created.data.id}`, { ...created.data, price: 6000 }, adminToken);
      assert.strictEqual(updated.data.price, 6000);
      assert.strictEqual((await call('DELETE', `/packages/${created.data.id}`, null, adminToken)).status, 200);
      const s = await call('PATCH', `/admin/bookings/${bookingId}`, { status: 'Completed' }, adminToken);
      assert.strictEqual(s.data.status, 'Completed');
    });

    await step('admin: add & delete destination, messages', async () => {
      const d = await call('POST', '/destinations', { name: 'Test Place', country: 'India', category: 'Nature', description: 'Nice' }, adminToken);
      assert.strictEqual(d.status, 201);
      assert.strictEqual((await call('DELETE', `/destinations/${d.data.id}`, null, adminToken)).status, 200);
      const msgs = await call('GET', '/admin/messages', null, adminToken);
      assert.strictEqual(msgs.data.length, 1);
    });

    await step('static frontend is served', async () => {
      const res = await fetch(`http://localhost:${PORT}/`);
      assert.ok((await res.text()).includes('Wanderlust'));
      const js = await fetch(`http://localhost:${PORT}/js/app.js`);
      assert.strictEqual(js.status, 200);
    });

    await step('data persists in SQLite after server restart', async () => {
      await stopServer(server);
      server = await startServer();
      const login = await call('POST', '/auth/login', { email: 'test@example.com', password: 'secret12' });
      assert.strictEqual(login.status, 200);
      const mine = await call('GET', '/bookings', null, login.data.token);
      assert.strictEqual(mine.data.length, 1);
      assert.deepStrictEqual(login.data.user.wishlist, ['bali-bliss']);
    });

    console.log(`\nAll ${passed} tests passed ✅`);
  } finally {
    await stopServer(server);
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* temp folder cleanup is best-effort */
    }
  }
}

main().catch(() => {
  process.exitCode = 1;
});
