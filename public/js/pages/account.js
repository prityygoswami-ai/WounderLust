import { api, auth } from '../api.js';
import {
  packageCard, bindWishlist, loader, empty, esc, inr, fmtDate, toast, statusBadge,
  imgTag, formData, withLoading, openModal, closeModal, $
} from '../ui.js';

/* ------------------------------ My bookings ------------------------------ */

export async function bookingsPage(root) {
  root.innerHTML = `
    <section class="page-header"><div class="container"><h1>My Bookings</h1><p>Track, view and manage your trips.</p></div></section>
    <section class="section container" id="bookingList">${loader()}</section>`;
  const list = $('#bookingList', root);

  async function load() {
    try {
      const bookings = await api('/bookings');
      if (!bookings.length) {
        list.innerHTML = empty('🧳', 'You have no bookings yet.', '<a class="btn btn-primary" href="#/packages">Explore packages</a>');
        return;
      }
      list.innerHTML = bookings.map((b) => `
        <article class="card booking-card mt-2">
          ${imgTag(b.packageImage, b.packageTitle)}
          <div>
            <h3 style="margin:0"><a href="#/package/${esc(b.packageId)}">${esc(b.packageTitle)}</a></h3>
            <div class="card-meta mt-2">
              <span>🔖 ${esc(b.ref)}</span>
              <span>📅 ${fmtDate(b.travelDate)}</span>
              <span>👥 ${b.travelers} traveller(s)</span>
              <span>💳 ${esc(b.paymentMethod)}</span>
            </div>
            <div class="flex mt-2">${statusBadge(b.status)} ${statusBadge(b.paymentStatus)}</div>
          </div>
          <div class="center">
            <div class="price">${inr(b.total)}</div>
            <button class="btn btn-light btn-sm mt-2" data-view="${b.id}">Details</button>
            ${['Pending', 'Confirmed'].includes(b.status)
              ? `<button class="btn btn-danger btn-sm mt-2" data-cancel="${b.id}">Cancel</button>` : ''}
          </div>
        </article>`).join('');

      list.onclick = async (e) => {
        const viewId = e.target.closest('[data-view]')?.dataset.view;
        const cancelId = e.target.closest('[data-cancel]')?.dataset.cancel;
        if (viewId) showBooking(bookings.find((b) => b.id === viewId));
        if (cancelId) confirmCancel(cancelId, load);
      };
    } catch (err) {
      list.innerHTML = empty('⚠️', esc(err.message));
    }
  }
  load();
}

function showBooking(b) {
  openModal(`
    <h2>Booking ${esc(b.ref)}</h2>
    <div class="price-summary">
      <div><span>Package</span><span>${esc(b.packageTitle)}</span></div>
      <div><span>Booked on</span><span>${fmtDate(b.createdAt)}</span></div>
      <div><span>Travel date</span><span>${fmtDate(b.travelDate)} (${b.days} days)</span></div>
      <div><span>Lead traveller</span><span>${esc(b.contactName)} · ${esc(b.contactPhone)}</span></div>
      <div><span>Travellers</span><span>${b.travelers}</span></div>
      <div><span>Status</span><span>${statusBadge(b.status)}</span></div>
      <div><span>Payment</span><span>${esc(b.paymentMethod)} · ${statusBadge(b.paymentStatus)}</span></div>
      ${b.specialRequests ? `<div><span>Requests</span><span>${esc(b.specialRequests)}</span></div>` : ''}
      <div><span>Subtotal</span><span>${inr(b.subtotal)}</span></div>
      ${b.discount ? `<div><span>Group discount</span><span>− ${inr(b.discount)}</span></div>` : ''}
      <div><span>GST (5%)</span><span>${inr(b.taxes)}</span></div>
      <div class="total"><span>Total</span><span>${inr(b.total)}</span></div>
    </div>`);
}

function confirmCancel(id, reload) {
  openModal(`
    <h2>Cancel booking?</h2>
    <p class="muted">This cannot be undone. If you paid online, a refund will be initiated.</p>
    <div class="flex">
      <button class="btn btn-danger" id="confirmCancel">Yes, cancel booking</button>
      <button class="btn btn-light" id="keepBooking">Keep booking</button>
    </div>`);
  $('#keepBooking').onclick = closeModal;
  $('#confirmCancel').onclick = async (e) => {
    await withLoading(e.target, async () => {
      try {
        await api(`/bookings/${id}/cancel`, { method: 'POST' });
        closeModal();
        toast('Booking cancelled', 'success');
        reload();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  };
}

/* -------------------------------- Wishlist -------------------------------- */

export async function wishlistPage(root) {
  root.innerHTML = `
    <section class="page-header"><div class="container"><h1>My Wishlist ❤️</h1><p>Packages you saved for later.</p></div></section>
    <section class="section container"><div class="grid" id="wishGrid">${loader()}</div></section>`;
  const grid = $('#wishGrid', root);

  async function load() {
    try {
      const items = await api('/wishlist');
      grid.innerHTML = items.length
        ? items.map(packageCard).join('')
        : empty('🤍', 'Your wishlist is empty.', '<a class="btn btn-primary" href="#/packages">Find packages</a>');
    } catch (err) {
      grid.innerHTML = empty('⚠️', esc(err.message));
    }
  }
  bindWishlist(grid, load);
  load();
}

/* -------------------------------- Profile -------------------------------- */

export function profilePage(root) {
  const u = auth.user;
  root.innerHTML = `
    <section class="page-header"><div class="container"><h1>My Profile</h1><p>Manage your account details.</p></div></section>
    <section class="section container" style="max-width:640px">
      <div class="panel">
        <form class="form" id="profileForm">
          <div class="field"><label>Email</label><input value="${esc(u.email)}" disabled /></div>
          <div class="form-row">
            <div class="field"><label>Full name</label><input name="name" value="${esc(u.name)}" required /></div>
            <div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone || '')}" /></div>
          </div>
          <h3 class="mt-2">Change password <small class="muted">(optional)</small></h3>
          <div class="form-row">
            <div class="field"><label>Current password</label><input type="password" name="currentPassword" autocomplete="current-password" /></div>
            <div class="field"><label>New password</label><input type="password" name="newPassword" minlength="6" autocomplete="new-password" /></div>
          </div>
          <p class="form-error" id="profileError"></p>
          <button class="btn btn-primary" type="submit">Save changes</button>
        </form>
      </div>
    </section>`;

  const form = $('#profileForm', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#profileError', root).textContent = '';
    await withLoading(form.querySelector('button'), async () => {
      try {
        const { user } = await api('/auth/me', { method: 'PUT', body: formData(form) });
        auth.set(null, user);
        form.currentPassword.value = '';
        form.newPassword.value = '';
        toast('Profile updated', 'success');
      } catch (err) {
        $('#profileError', root).textContent = err.message;
      }
    });
  });
}
