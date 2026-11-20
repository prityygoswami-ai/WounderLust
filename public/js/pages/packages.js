import { api, auth } from '../api.js';
import { queryParams } from '../router.js';
import {
  packageCard, bindWishlist, loader, empty, esc, inr, stars, fmtDate, toast,
  openModal, closeModal, formData, withLoading, $
} from '../ui.js';

const TYPES = ['All', 'Leisure', 'Adventure', 'Honeymoon', 'Family', 'Cultural', 'Spiritual'];
const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Pay at Office'];

/* ------------------------------ Package list ------------------------------ */

export async function packagesPage(root) {
  const initial = queryParams();
  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <h1>Tour Packages</h1>
        <p>All-inclusive holidays with stays, transfers and guided sightseeing.</p>
      </div>
    </section>
    <section class="section container">
      <form class="filters" id="pkgFilters">
        <input name="q" placeholder="Search packages or destinations..." value="${esc(initial.q || '')}" />
        <select name="type">
          ${TYPES.map((t) => `<option value="${t === 'All' ? '' : t}" ${initial.type === t ? 'selected' : ''}>${t === 'All' ? 'All trip types' : t}</option>`).join('')}
        </select>
        <select name="maxPrice">
          <option value="">Any budget</option>
          ${[15000, 30000, 60000, 100000, 200000].map((v) => `<option value="${v}" ${initial.maxPrice == v ? 'selected' : ''}>Under ${inr(v)}</option>`).join('')}
        </select>
        <select name="sort">
          <option value="">Sort: Recommended</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="duration">Duration: Shortest</option>
          <option value="rating">Top Rated</option>
        </select>
      </form>
      <p class="muted" id="pkgCount"></p>
      <div class="grid" id="pkgGrid">${loader()}</div>
    </section>`;

  const form = $('#pkgFilters', root);
  const grid = $('#pkgGrid', root);

  async function load() {
    grid.innerHTML = loader();
    try {
      const items = await api('/packages', { query: formData(form) });
      $('#pkgCount', root).textContent = `${items.length} package${items.length === 1 ? '' : 's'} found`;
      grid.innerHTML = items.length
        ? items.map(packageCard).join('')
        : empty('🧳', 'No packages match your filters. Try widening your search.');
    } catch (err) {
      grid.innerHTML = empty('⚠️', esc(err.message));
    }
  }

  let timer;
  form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  bindWishlist(grid);
  load();
}

/* ----------------------------- Package detail ----------------------------- */

export async function packageDetailPage(root, { id }) {
  root.innerHTML = loader();
  let p;
  try {
    p = await api(`/packages/${encodeURIComponent(id)}`);
  } catch (err) {
    root.innerHTML = empty('🧳', esc(err.message), '<a class="btn btn-primary" href="#/packages">Back to packages</a>');
    return;
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const wished = auth.user?.wishlist?.includes(p.id);

  root.innerHTML = `
    <section class="detail-hero" style="background-image:linear-gradient(120deg,#095c63,#ff7a45);">
      <div class="container">
        <span class="tag">${esc(p.type)}</span>
        <h1>${esc(p.title)}</h1>
        <p>📍 ${esc(p.destinationName)}, ${esc(p.country)} · 🗓 ${p.days} Days / ${p.nights} Nights ·
          <span class="rating">${stars(p.rating)}</span> (${p.reviews.length} reviews)</p>
      </div>
    </section>

    <section class="section container detail-layout">
      <div>
        <div class="panel">
          <div class="flex between">
            <h2 style="margin:0">Package Inclusions</h2>
            <button class="btn btn-light btn-sm" data-wish="${esc(p.id)}">${wished ? '❤️ Saved' : '🤍 Save'}</button>
          </div>
          <ul class="list-check mt-2">${p.inclusions.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>

        <div class="panel">
          <h2>Day-wise Itinerary</h2>
          <div class="timeline">
            ${p.itinerary.map((d, i) => `
              <div class="timeline-item">
                <h4>Day ${i + 1}: ${esc(d.title)}</h4>
                <p>${esc(d.desc)}</p>
              </div>`).join('')}
          </div>
        </div>

        <div class="panel" id="reviewsPanel"></div>
      </div>

      <aside class="panel sticky">
        <div class="price">${inr(p.price)} <small>per person</small></div>
        <p class="muted" style="margin:4px 0 16px">${p.seatsLeft > 0 ? `🔥 Only ${p.seatsLeft} seats left` : '❌ Sold out'}</p>
        <form class="form" id="bookingForm">
          <div class="form-row">
            <div class="field"><label>Travel date</label><input type="date" name="travelDate" min="${minDate}" required /></div>
            <div class="field"><label>Travellers</label><input type="number" name="travelers" min="1" max="${Math.min(20, Math.max(1, p.seatsLeft))}" value="2" required /></div>
          </div>
          <div class="price-summary" id="priceSummary"></div>
          <button class="btn btn-accent btn-block" type="submit" ${p.seatsLeft ? '' : 'disabled'}>
            ${auth.isLoggedIn ? 'Book Now' : 'Log in to Book'}
          </button>
          <p class="muted center" style="font-size:.8rem;margin:0">Free cancellation · Instant confirmation</p>
        </form>
      </aside>
    </section>`;

  const hero = new Image();
  hero.onload = () => { $('.detail-hero', root).style.backgroundImage = `url("${p.image}")`; };
  hero.src = p.image;

  const form = $('#bookingForm', root);
  const updateSummary = () => {
    const travelers = Math.max(1, parseInt(form.travelers.value, 10) || 1);
    const subtotal = p.price * travelers;
    const discount = travelers >= 5 ? Math.round(subtotal * 0.1) : 0;
    const taxes = Math.round((subtotal - discount) * 0.05);
    $('#priceSummary', root).innerHTML = `
      <div><span>${inr(p.price)} × ${travelers} traveller(s)</span><span>${inr(subtotal)}</span></div>
      ${discount ? `<div style="color:var(--success)"><span>Group discount (10%)</span><span>− ${inr(discount)}</span></div>` : ''}
      <div><span>GST (5%)</span><span>${inr(taxes)}</span></div>
      <div class="total"><span>Total</span><span>${inr(subtotal - discount + taxes)}</span></div>`;
  };
  form.travelers.addEventListener('input', updateSummary);
  updateSummary();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!auth.isLoggedIn) {
      toast('Please log in to book this package', 'error');
      try { sessionStorage.setItem('wl_redirect', location.hash); } catch { /* ignore */ }
      location.hash = '#/login';
      return;
    }
    openCheckout(p, formData(form));
  });

  // Wishlist button on the detail page.
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-wish]');
    if (!btn) return;
    if (!auth.isLoggedIn) { location.hash = '#/login'; return; }
    try {
      const { wishlist, added } = await api(`/wishlist/${p.id}`, { method: 'POST' });
      auth.set(null, { ...auth.user, wishlist });
      btn.textContent = added ? '❤️ Saved' : '🤍 Save';
      toast(added ? 'Added to wishlist' : 'Removed from wishlist', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  renderReviews($('#reviewsPanel', root), p);
}

/* -------------------------------- Checkout -------------------------------- */

function openCheckout(p, { travelDate, travelers }) {
  if (!travelDate) { toast('Please choose a travel date', 'error'); return; }
  const user = auth.user;
  openModal(`
    <h2>Confirm your booking</h2>
    <p class="muted">${esc(p.title)} · ${fmtDate(travelDate)} · ${travelers} traveller(s)</p>
    <form class="form" id="checkoutForm">
      <div class="form-row">
        <div class="field"><label>Lead traveller name</label><input name="contactName" value="${esc(user.name)}" required /></div>
        <div class="field"><label>Phone number</label><input name="contactPhone" value="${esc(user.phone || '')}" placeholder="10-digit mobile" required /></div>
      </div>
      <div class="field">
        <label>Payment method</label>
        <select name="paymentMethod">${PAYMENT_METHODS.map((m) => `<option>${m}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Special requests (optional)</label><textarea name="specialRequests" placeholder="Dietary needs, room preference, etc."></textarea></div>
      <p class="demo-hint">💳 Demo payment: no real money is charged. Online methods confirm instantly; "Pay at Office" keeps the booking pending.</p>
      <p class="form-error" id="checkoutError"></p>
      <button class="btn btn-accent btn-block" type="submit">Pay & Confirm</button>
    </form>`);

  const form = $('#checkoutForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    await withLoading(btn, async () => {
      try {
        const booking = await api('/bookings', {
          method: 'POST',
          body: { packageId: p.id, travelDate, travelers, ...formData(form) }
        });
        showConfirmation(booking);
      } catch (err) {
        $('#checkoutError').textContent = err.message;
      }
    }, 'Processing payment...');
  });
}

function showConfirmation(b) {
  openModal(`
    <div class="center">
      <div style="font-size:3rem">🎉</div>
      <h2>Booking ${b.status === 'Confirmed' ? 'Confirmed' : 'Received'}!</h2>
      <p class="muted">Your booking reference is</p>
      <h3 style="color:var(--primary);letter-spacing:2px">${esc(b.ref)}</h3>
    </div>
    <div class="price-summary mt-2">
      <div><span>Package</span><span>${esc(b.packageTitle)}</span></div>
      <div><span>Travel date</span><span>${fmtDate(b.travelDate)}</span></div>
      <div><span>Travellers</span><span>${b.travelers}</span></div>
      <div><span>Payment</span><span>${esc(b.paymentMethod)} (${esc(b.paymentStatus)})</span></div>
      <div class="total"><span>Total</span><span>${inr(b.total)}</span></div>
    </div>
    <a class="btn btn-primary btn-block mt-2" href="#/bookings" id="goBookings">View my bookings</a>`);
  $('#goBookings').addEventListener('click', closeModal);
}

/* -------------------------------- Reviews -------------------------------- */

function renderReviews(panel, p) {
  const canReview = auth.isLoggedIn && !p.reviews.some((r) => r.userId === auth.user.id);
  panel.innerHTML = `
    <h2>Traveller Reviews <span class="rating">${stars(p.rating)}</span></h2>
    ${canReview ? `
      <form class="form" id="reviewForm" style="margin-bottom:12px">
        <div class="star-input">
          ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="star${n}" value="${n}" ${n === 5 ? 'checked' : ''}><label for="star${n}">★</label>`).join('')}
        </div>
        <textarea name="comment" placeholder="Share your experience..." required></textarea>
        <p class="form-error" id="reviewError"></p>
        <button class="btn btn-primary" type="submit">Post review</button>
      </form>` : ''}
    ${!auth.isLoggedIn ? '<p class="muted"><a href="#/login">Log in</a> to write a review.</p>' : ''}
    ${p.reviews.length
      ? p.reviews.map((r) => `
          <div class="review">
            <header><span>👤 ${esc(r.userName)}</span><span class="rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></header>
            <small class="muted">${fmtDate(r.createdAt)}</small>
            <p>${esc(r.comment)}</p>
          </div>`).join('')
      : '<p class="muted">No reviews yet. Be the first to review this package!</p>'}`;

  const form = $('#reviewForm', panel);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const result = await api(`/packages/${p.id}/reviews`, { method: 'POST', body: formData(form) });
      p.reviews = result.reviews;
      p.rating = result.rating;
      toast('Thanks for your review!', 'success');
      renderReviews(panel, p);
    } catch (err) {
      $('#reviewError', panel).textContent = err.message;
    }
  });
}
