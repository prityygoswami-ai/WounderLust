import { api, auth } from '../api.js';
import {
  loader, empty, esc, inr, fmtDate, toast, statusBadge, formData, withLoading,
  openModal, closeModal, $, $$
} from '../ui.js';

const TABS = [
  ['overview', '📊 Overview'],
  ['bookings', '🧾 Bookings'],
  ['packages', '🧳 Packages'],
  ['destinations', '🗺️ Destinations'],
  ['users', '👥 Users'],
  ['messages', '✉️ Messages']
];
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const TYPES = ['Leisure', 'Adventure', 'Honeymoon', 'Family', 'Cultural', 'Spiritual'];
const CATEGORIES = ['Beach', 'Mountain', 'Heritage', 'Nature', 'Adventure', 'Spiritual', 'City'];

export function adminPage(root) {
  root.innerHTML = `
    <div class="container dash">
      <nav class="dash-nav" id="dashNav">
        <h3 style="padding:8px 14px">Admin Panel</h3>
        ${TABS.map(([key, label], i) => `<button data-tab="${key}" class="${i === 0 ? 'active' : ''}">${label}</button>`).join('')}
      </nav>
      <section id="dashBody"></section>
    </div>`;

  const body = $('#dashBody', root);
  const views = { overview, bookings, packages, destinations, users, messages };

  $('#dashNav', root).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    $$('[data-tab]', root).forEach((b) => b.classList.toggle('active', b === btn));
    show(btn.dataset.tab);
  });

  async function show(tab) {
    body.innerHTML = loader();
    body.onclick = null; // clear handlers left by the previous tab
    body.onchange = null;
    try {
      await views[tab](body);
    } catch (err) {
      body.innerHTML = empty('⚠️', esc(err.message));
    }
  }
  show('overview');
}

/* -------------------------------- Overview -------------------------------- */

async function overview(body) {
  const [s, health] = await Promise.all([api('/admin/stats'), api('/health')]);
  const t = s.totals;
  const storageNote = health.storage === 'turso-sqlite'
    ? '<p class="demo-hint">✅ Database: SQLite on Turso cloud (permanent)</p>'
    : '<p class="demo-hint">🗄️ Database: SQLite file (<code>data/wanderlust.db</code>). On Vercel, connect Turso for permanent storage (see README).</p>';
  const maxTop = Math.max(1, ...s.topPackages.map((p) => p.count));
  const maxStatus = Math.max(1, ...s.statusCounts.map((x) => x.count));

  body.innerHTML = `
    <div class="flex between"><h2>Dashboard Overview</h2>
      <button class="btn btn-light btn-sm" id="resetDb">↺ Reset demo data</button></div>
    ${storageNote}
    <div class="kpis mt-2">
      <div class="kpi"><span>Total revenue</span><strong>${inr(t.revenue)}</strong></div>
      <div class="kpi"><span>Bookings</span><strong>${t.bookings}</strong></div>
      <div class="kpi"><span>Customers</span><strong>${t.users}</strong></div>
      <div class="kpi"><span>Packages</span><strong>${t.packages}</strong></div>
      <div class="kpi"><span>Destinations</span><strong>${t.destinations}</strong></div>
      <div class="kpi"><span>Unread messages</span><strong>${t.unreadMessages}</strong></div>
    </div>
    <div class="form-row">
      <div class="panel">
        <h2>Bookings by status</h2>
        ${s.statusCounts.map((x) => `
          <div class="bar-row"><span>${x.status}</span><div class="bar"><i style="width:${(x.count / maxStatus) * 100}%"></i></div><strong>${x.count}</strong></div>`).join('')}
      </div>
      <div class="panel">
        <h2>Top packages</h2>
        ${s.topPackages.length
          ? s.topPackages.map((p) => `
            <div class="bar-row"><span>${esc(p.title)}</span><div class="bar"><i style="width:${(p.count / maxTop) * 100}%"></i></div><strong>${p.count}</strong></div>`).join('')
          : '<p class="muted">No bookings yet.</p>'}
      </div>
    </div>
    <h2>Recent bookings</h2>
    ${bookingTable(s.recentBookings, false)}`;

  $('#resetDb', body).onclick = () => {
    openModal(`
      <h2>Reset demo data?</h2>
      <p class="muted">All bookings, users, messages and changes will be erased and the original demo data restored.
        You will need to log in again.</p>
      <div class="flex"><button class="btn btn-danger" id="doReset">Reset everything</button>
      <button class="btn btn-light" id="cancelReset">Cancel</button></div>`);
    $('#cancelReset').onclick = closeModal;
    $('#doReset').onclick = async () => {
      await api('/admin/reset', { method: 'POST' });
      closeModal();
      toast('Demo data restored. Please log in again.', 'success');
      auth.clear();
      location.hash = '#/login';
    };
  };
}

/* -------------------------------- Bookings -------------------------------- */

function bookingTable(items, editable) {
  if (!items.length) return empty('🧾', 'No bookings found.');
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Ref</th><th>Customer</th><th>Package</th><th>Travel date</th><th>Pax</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          ${items.map((b) => `
            <tr>
              <td><strong>${esc(b.ref)}</strong><br><small class="muted">${fmtDate(b.createdAt)}</small></td>
              <td>${esc(b.userName)}<br><small class="muted">${esc(b.contactPhone)}</small></td>
              <td>${esc(b.packageTitle)}</td>
              <td>${fmtDate(b.travelDate)}</td>
              <td>${b.travelers}</td>
              <td>${inr(b.total)}</td>
              <td>${statusBadge(b.paymentStatus)}</td>
              <td>${editable
                ? `<select data-status="${b.id}">${STATUSES.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`
                : statusBadge(b.status)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function bookings(body, status = 'All') {
  const items = await api('/admin/bookings', { query: { status } });
  body.innerHTML = `
    <div class="flex between"><h2>All Bookings</h2>
      <select id="statusFilter" style="width:auto">
        ${['All', ...STATUSES].map((s) => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
    ${bookingTable(items, true)}`;

  $('#statusFilter', body).onchange = (e) => bookings(body, e.target.value);
  body.onchange = async (e) => {
    const id = e.target.dataset?.status;
    if (!id) return;
    try {
      await api(`/admin/bookings/${id}`, { method: 'PATCH', body: { status: e.target.value } });
      toast('Booking status updated', 'success');
      bookings(body, status);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

/* -------------------------------- Packages -------------------------------- */

async function packages(body) {
  body.onchange = null;
  const [items, dests] = await Promise.all([api('/packages'), api('/destinations')]);
  body.innerHTML = `
    <div class="flex between"><h2>Tour Packages (${items.length})</h2>
      <button class="btn btn-primary btn-sm" id="addPkg">+ Add package</button></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Destination</th><th>Type</th><th>Duration</th><th>Price</th><th>Seats left</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map((p) => `
            <tr>
              <td><a href="#/package/${esc(p.id)}">${esc(p.title)}</a> ${p.featured ? '⭐' : ''}</td>
              <td>${esc(p.destinationName)}</td>
              <td>${esc(p.type)}</td>
              <td>${p.days}D/${p.nights}N</td>
              <td>${inr(p.price)}</td>
              <td>${p.seatsLeft}/${p.seats}</td>
              <td class="flex"><button class="btn btn-light btn-sm" data-edit="${esc(p.id)}">Edit</button>
                <button class="btn btn-danger btn-sm" data-del="${esc(p.id)}">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $('#addPkg', body).onclick = () => packageForm(null, dests, () => packages(body));
  body.onclick = async (e) => {
    const editId = e.target.dataset?.edit;
    const delId = e.target.dataset?.del;
    if (editId) packageForm(await api(`/packages/${editId}`), dests, () => packages(body));
    if (delId) {
      confirmDelete('package', async () => {
        await api(`/packages/${delId}`, { method: 'DELETE' });
        packages(body);
      });
    }
  };
}

function packageForm(p, dests, done) {
  const v = p || { type: 'Leisure', seats: 20, days: 3, inclusions: [], itinerary: [] };
  openModal(`
    <h2>${p ? 'Edit package' : 'Add new package'}</h2>
    <form class="form" id="pkgForm">
      <div class="field"><label>Title</label><input name="title" value="${esc(v.title || '')}" required /></div>
      <div class="form-row">
        <div class="field"><label>Destination</label>
          <select name="destinationId" required>${dests.map((d) => `<option value="${esc(d.id)}" ${d.id === v.destinationId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Type</label>
          <select name="type">${TYPES.map((t) => `<option ${t === v.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Days</label><input type="number" name="days" min="1" value="${v.days}" required /></div>
        <div class="field"><label>Price / person (₹)</label><input type="number" name="price" min="1" value="${v.price || ''}" required /></div>
        <div class="field"><label>Total seats</label><input type="number" name="seats" min="1" value="${v.seats}" required /></div>
      </div>
      <div class="field"><label>Image URL</label><input name="image" value="${esc(v.image || '')}" placeholder="https://..." /></div>
      <div class="field"><label>Inclusions (one per line)</label><textarea name="inclusions">${esc(v.inclusions.join('\n'))}</textarea></div>
      <div class="field"><label>Itinerary (one day per line, format "Title: description")</label>
        <textarea name="itinerary" rows="5">${esc(v.itinerary.map((d) => `${d.title}: ${d.desc}`).join('\n'))}</textarea></div>
      <label class="flex"><input type="checkbox" name="featured" style="width:auto" ${v.featured ? 'checked' : ''}/> Show as featured on home page</label>
      <p class="form-error" id="pkgError"></p>
      <button class="btn btn-primary" type="submit">${p ? 'Save changes' : 'Create package'}</button>
    </form>`);

  const form = $('#pkgForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { ...formData(form), featured: form.featured.checked };
    await withLoading(form.querySelector('button'), async () => {
      try {
        await api(p ? `/packages/${p.id}` : '/packages', { method: p ? 'PUT' : 'POST', body: data });
        closeModal();
        toast(p ? 'Package updated' : 'Package created', 'success');
        done();
      } catch (err) {
        $('#pkgError').textContent = err.message;
      }
    });
  });
}

/* ------------------------------ Destinations ------------------------------ */

async function destinations(body) {
  body.onchange = null;
  const items = await api('/destinations');
  body.innerHTML = `
    <div class="flex between"><h2>Destinations (${items.length})</h2>
      <button class="btn btn-primary btn-sm" id="addDest">+ Add destination</button></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Country</th><th>Category</th><th>Best time</th><th>Packages</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map((d) => `
            <tr>
              <td><a href="#/destination/${esc(d.id)}">${esc(d.name)}</a></td>
              <td>${esc(d.country)}</td>
              <td>${esc(d.category)}</td>
              <td>${esc(d.bestTime)}</td>
              <td>${d.packageCount}</td>
              <td><button class="btn btn-danger btn-sm" data-del="${esc(d.id)}">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $('#addDest', body).onclick = () => destinationForm(() => destinations(body));
  body.onclick = (e) => {
    const delId = e.target.dataset?.del;
    if (delId) {
      confirmDelete('destination', async () => {
        await api(`/destinations/${delId}`, { method: 'DELETE' });
        destinations(body);
      });
    }
  };
}

function destinationForm(done) {
  openModal(`
    <h2>Add destination</h2>
    <form class="form" id="destForm">
      <div class="form-row">
        <div class="field"><label>Name</label><input name="name" required /></div>
        <div class="field"><label>Country</label><input name="country" value="India" required /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Region / State</label><input name="region" /></div>
        <div class="field"><label>Category</label><select name="category">${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Best time to visit</label><input name="bestTime" placeholder="October - March" /></div>
        <div class="field"><label>Rating (0-5)</label><input type="number" name="rating" min="0" max="5" step="0.1" value="4.5" /></div>
      </div>
      <div class="field"><label>Image URL</label><input name="image" placeholder="https://..." /></div>
      <div class="field"><label>Description</label><textarea name="description" required></textarea></div>
      <div class="field"><label>Highlights (one per line)</label><textarea name="highlights"></textarea></div>
      <p class="form-error" id="destError"></p>
      <button class="btn btn-primary" type="submit">Create destination</button>
    </form>`);

  const form = $('#destForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await withLoading(form.querySelector('button'), async () => {
      try {
        await api('/destinations', { method: 'POST', body: formData(form) });
        closeModal();
        toast('Destination created', 'success');
        done();
      } catch (err) {
        $('#destError').textContent = err.message;
      }
    });
  });
}

/* ---------------------------- Users & messages ---------------------------- */

async function users(body) {
  body.onclick = null;
  body.onchange = null;
  const items = await api('/admin/users');
  body.innerHTML = `
    <h2>Registered Users (${items.length})</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Bookings</th><th>Joined</th></tr></thead>
        <tbody>${items.map((u) => `
          <tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || '-')}</td>
          <td><span class="tag">${esc(u.role)}</span></td><td>${u.bookings}</td><td>${fmtDate(u.createdAt)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function messages(body) {
  body.onchange = null;
  const items = await api('/admin/messages');
  body.innerHTML = `
    <h2>Contact Messages (${items.length})</h2>
    ${items.length ? items.map((m) => `
      <div class="panel" style="${m.read ? '' : 'border-left:4px solid var(--accent)'}">
        <div class="flex between">
          <strong>${esc(m.subject)}</strong>
          <small class="muted">${fmtDate(m.createdAt)}</small>
        </div>
        <p class="muted" style="margin:4px 0">${esc(m.name)} · ${esc(m.email)}</p>
        <p>${esc(m.message)}</p>
        <div class="flex">
          ${m.read ? '<span class="tag">Read</span>' : `<button class="btn btn-light btn-sm" data-read="${m.id}">Mark as read</button>`}
          <button class="btn btn-danger btn-sm" data-delmsg="${m.id}">Delete</button>
        </div>
      </div>`).join('') : empty('📭', 'No messages yet.')}`;

  body.onclick = async (e) => {
    const { read, delmsg } = e.target.dataset || {};
    try {
      if (read) await api(`/admin/messages/${read}`, { method: 'PATCH' });
      if (delmsg) await api(`/admin/messages/${delmsg}`, { method: 'DELETE' });
      if (read || delmsg) messages(body);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

/* --------------------------------- Shared --------------------------------- */

function confirmDelete(what, action) {
  openModal(`
    <h2>Delete ${what}?</h2>
    <p class="muted">This action cannot be undone.</p>
    <div class="flex"><button class="btn btn-danger" id="doDelete">Delete</button>
    <button class="btn btn-light" id="cancelDelete">Cancel</button></div>`);
  $('#cancelDelete').onclick = closeModal;
  $('#doDelete').onclick = async (e) => {
    await withLoading(e.target, async () => {
      try {
        await action();
        closeModal();
        toast(`${what[0].toUpperCase() + what.slice(1)} deleted`, 'success');
      } catch (err) {
        closeModal();
        toast(err.message, 'error');
      }
    });
  };
}
