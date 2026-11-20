import { api } from '../api.js';
import { destinationCard, packageCard, bindWishlist, loader, $ } from '../ui.js';

export async function homePage(root) {
  root.innerHTML = `
    <section class="hero">
      <div class="container">
        <p class="eyebrow">Explore the world with us</p>
        <h1>Discover breathtaking places & book your dream holiday</h1>
        <p>Handpicked destinations, all-inclusive tour packages and a smart trip planner that fits your budget.</p>
        <form class="search-box" id="heroSearch">
          <input name="q" placeholder="Where do you want to go? (e.g. Goa, Bali)" />
          <select name="type">
            <option value="">Any trip type</option>
            <option>Leisure</option><option>Adventure</option><option>Honeymoon</option>
            <option>Family</option><option>Cultural</option><option>Spiritual</option>
          </select>
          <select name="maxPrice">
            <option value="">Any budget</option>
            <option value="15000">Under ₹15,000</option>
            <option value="30000">Under ₹30,000</option>
            <option value="60000">Under ₹60,000</option>
            <option value="200000">Under ₹2,00,000</option>
          </select>
          <button class="btn btn-accent" type="submit">🔍 Search</button>
        </form>
      </div>
    </section>

    <div class="container">
      <div class="stats-bar">
        <div><strong>12+</strong><span>Destinations</span></div>
        <div><strong>5,000+</strong><span>Happy Travellers</span></div>
        <div><strong>24/7</strong><span>Travel Support</span></div>
        <div><strong>4.8★</strong><span>Average Rating</span></div>
      </div>
    </div>

    <section class="section container">
      <div class="section-head">
        <p class="eyebrow">Top picks</p>
        <h2>Popular Destinations</h2>
        <p>From sun-kissed beaches to snow-capped mountains, explore places travellers love most.</p>
      </div>
      <div class="grid" id="homeDestinations">${loader()}</div>
      <div class="center mt-3"><a class="btn btn-outline" href="#/destinations">View all destinations</a></div>
    </section>

    <section class="section container" style="padding-top:0">
      <div class="section-head">
        <p class="eyebrow">Best sellers</p>
        <h2>Featured Tour Packages</h2>
        <p>All-inclusive packages with hotels, transfers and sightseeing at the best prices.</p>
      </div>
      <div class="grid" id="homePackages">${loader()}</div>
      <div class="center mt-3"><a class="btn btn-primary" href="#/packages">Browse all packages</a></div>
    </section>

    <section class="section container" style="padding-top:0">
      <div class="section-head">
        <p class="eyebrow">Why Wanderlust</p>
        <h2>Travel made simple</h2>
      </div>
      <div class="features">
        <div class="feature"><div class="icon">💰</div><h3>Best Price</h3><p>Transparent pricing with group discounts and no hidden fees.</p></div>
        <div class="feature"><div class="icon">🔒</div><h3>Secure Booking</h3><p>Instant confirmation with a unique booking reference.</p></div>
        <div class="feature"><div class="icon">🧭</div><h3>Smart Planner</h3><p>Get personalised trip suggestions based on budget & interests.</p></div>
        <div class="feature"><div class="icon">📞</div><h3>24/7 Support</h3><p>Our travel experts are always just a message away.</p></div>
      </div>
    </section>

    <section class="container">
      <div class="cta">
        <h2>Not sure where to go?</h2>
        <p>Tell us your budget, dates and interests — our Smart Trip Planner will suggest the perfect holiday.</p>
        <a class="btn" href="#/planner">Plan my trip ✨</a>
      </div>
    </section>`;

  $('#heroSearch', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams(
      Object.entries(Object.fromEntries(new FormData(e.target))).filter(([, v]) => v)
    );
    location.hash = `#/packages${params.toString() ? '?' + params : ''}`;
  });

  bindWishlist($('#homePackages', root));

  try {
    const [destinations, packages] = await Promise.all([
      api('/destinations'),
      api('/packages', { query: { featured: 'true' } })
    ]);
    $('#homeDestinations', root).innerHTML = destinations.slice(0, 6).map(destinationCard).join('');
    $('#homePackages', root).innerHTML = packages.slice(0, 6).map(packageCard).join('');
  } catch (err) {
    $('#homeDestinations', root).innerHTML = `<p class="form-error">${err.message}</p>`;
    $('#homePackages', root).innerHTML = '';
  }
}
