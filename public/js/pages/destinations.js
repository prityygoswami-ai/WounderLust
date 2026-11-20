import { api } from '../api.js';
import { destinationCard, packageCard, bindWishlist, loader, empty, esc, stars, $, $$ } from '../ui.js';

const CATEGORIES = ['All', 'Beach', 'Mountain', 'Heritage', 'Nature', 'Adventure', 'Spiritual', 'City'];

export async function destinationsPage(root) {
  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <h1>Explore Destinations</h1>
        <p>Find your next adventure from our curated list of places.</p>
      </div>
    </section>
    <section class="section container">
      <div class="filters" style="grid-template-columns:1fr">
        <input id="destSearch" placeholder="Search by name, country or region..." />
      </div>
      <div class="tabs" id="destTabs">
        ${CATEGORIES.map((c, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <div class="grid" id="destGrid">${loader()}</div>
    </section>`;

  const state = { q: '', category: 'All' };
  const grid = $('#destGrid', root);

  async function load() {
    grid.innerHTML = loader();
    try {
      const items = await api('/destinations', { query: state });
      grid.innerHTML = items.length
        ? items.map(destinationCard).join('')
        : empty('🗺️', 'No destinations match your search.');
    } catch (err) {
      grid.innerHTML = empty('⚠️', esc(err.message));
    }
  }

  let timer;
  $('#destSearch', root).addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value; load(); }, 300);
  });
  $('#destTabs', root).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    $$('.tab', root).forEach((t) => t.classList.toggle('active', t === btn));
    state.category = btn.dataset.cat;
    load();
  });

  load();
}

export async function destinationDetailPage(root, { id }) {
  root.innerHTML = loader();
  let d;
  try {
    d = await api(`/destinations/${encodeURIComponent(id)}`);
  } catch (err) {
    root.innerHTML = empty('🧭', esc(err.message), '<a class="btn btn-primary" href="#/destinations">Back to destinations</a>');
    return;
  }

  root.innerHTML = `
    <section class="detail-hero" style="background-image:linear-gradient(120deg,#095c63,#0e7c86);">
      <div class="container">
        <span class="tag">${esc(d.category)}</span>
        <h1>${esc(d.name)}</h1>
        <p>📍 ${esc(d.region)}, ${esc(d.country)} · <span class="rating">${stars(d.rating)}</span></p>
      </div>
    </section>
    <section class="section container detail-layout">
      <div>
        <div class="panel">
          <h2>About ${esc(d.name)}</h2>
          <p>${esc(d.description)}</p>
          <p><strong>🌤 Best time to visit:</strong> ${esc(d.bestTime || 'All year round')}</p>
        </div>
        <div class="panel">
          <h2>Top Highlights</h2>
          <ul class="list-check">${(d.highlights || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        </div>
        <h2 class="mt-3">Packages for ${esc(d.name)}</h2>
        <div class="grid" id="destPackages">
          ${d.packages.length
            ? d.packages.map((p) => packageCard({ ...p, destinationName: d.name })).join('')
            : empty('🧳', 'No packages available yet. Contact us for a custom trip!')}
        </div>
      </div>
      <aside class="panel sticky">
        <h2>Plan a trip to ${esc(d.name)}</h2>
        <p class="muted">Need a custom itinerary, hotel or transport? Our experts will design it for you.</p>
        <a class="btn btn-accent btn-block" href="#/contact?subject=${encodeURIComponent('Custom trip to ' + d.name)}">Request custom trip</a>
        <a class="btn btn-light btn-block mt-2" href="#/planner">Use Smart Planner</a>
      </aside>
    </section>`;

  // Load the hero photo only if it actually exists, otherwise keep the gradient.
  const img = new Image();
  img.onload = () => {
    $('.detail-hero', root).style.backgroundImage = `url("${d.image}")`;
  };
  img.src = d.image;

  bindWishlist($('#destPackages', root));
}
