// Reusable UI helpers: escaping, formatting, toast, modal and card templates.
import { api, auth } from './api.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const stars = (r) => (r ? `★ ${Number(r).toFixed(1)}` : '★ New');

// Fallback image when an external photo fails to load.
const FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'><defs><linearGradient id='g'><stop offset='0' stop-color='%230e7c86'/><stop offset='1' stop-color='%23ff7a45'/></linearGradient></defs><rect width='16' height='10' fill='url(%23g)'/></svg>";
export const imgTag = (src, alt) =>
  `<img src="${esc(src) || FALLBACK}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK}'">`;

export function toast(message, type = 'info') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

export function openModal(html) {
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
export function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

export const loader = () => '<div class="loader"></div>';
export const empty = (icon, text, action = '') =>
  `<div class="empty"><div class="icon">${icon}</div><p>${text}</p>${action}</div>`;
export const statusBadge = (s) => `<span class="status status-${esc(String(s).split(' ')[0])}">${esc(s)}</span>`;

export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/** Disable a form's submit button while an async action runs. */
export async function withLoading(button, fn, label = 'Please wait...') {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

export function destinationCard(d) {
  return `
    <article class="card">
      <a href="#/destination/${esc(d.id)}" class="card-media">
        ${imgTag(d.image, d.name)}
        <span class="card-badge">${esc(d.category)}</span>
      </a>
      <div class="card-body">
        <div class="flex between">
          <h3><a href="#/destination/${esc(d.id)}">${esc(d.name)}</a></h3>
          <span class="rating">${stars(d.rating)}</span>
        </div>
        <div class="card-meta"><span>📍 ${esc(d.region)}, ${esc(d.country)}</span></div>
        <p class="muted" style="margin:0;font-size:.9rem">${esc(d.description).slice(0, 95)}…</p>
        <div class="card-foot">
          <span class="price">${d.startingPrice ? `${inr(d.startingPrice)} <small>onwards</small>` : '<small>Coming soon</small>'}</span>
          <a class="btn btn-outline btn-sm" href="#/destination/${esc(d.id)}">Explore</a>
        </div>
      </div>
    </article>`;
}

export function packageCard(p) {
  const wished = auth.user?.wishlist?.includes(p.id);
  return `
    <article class="card">
      <div class="card-media">
        <a href="#/package/${esc(p.id)}">${imgTag(p.image, p.title)}</a>
        <span class="card-badge">${esc(p.type)}</span>
        <button class="wish-btn" data-wish="${esc(p.id)}" title="Save to wishlist">${wished ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <h3><a href="#/package/${esc(p.id)}">${esc(p.title)}</a></h3>
        <div class="card-meta">
          <span>📍 ${esc(p.destinationName)}</span>
          <span>🗓 ${p.days}D / ${p.nights}N</span>
          <span class="rating">${stars(p.rating)}</span>
        </div>
        <div class="card-foot">
          <span class="price">${inr(p.price)} <small>/ person</small></span>
          <a class="btn btn-primary btn-sm" href="#/package/${esc(p.id)}">View</a>
        </div>
      </div>
    </article>`;
}

/** Event delegation for wishlist heart buttons inside a container. */
export function bindWishlist(root, onChange) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-wish]');
    if (!btn) return;
    e.preventDefault();
    if (!auth.isLoggedIn) {
      toast('Please log in to save packages to your wishlist', 'error');
      location.hash = '#/login';
      return;
    }
    try {
      const { wishlist, added } = await api(`/wishlist/${btn.dataset.wish}`, { method: 'POST' });
      auth.set(null, { ...auth.user, wishlist });
      btn.textContent = added ? '❤️' : '🤍';
      toast(added ? 'Added to wishlist' : 'Removed from wishlist', 'success');
      onChange?.();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
