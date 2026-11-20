import { api } from '../api.js';
import { esc, inr, imgTag, loader, empty, formData, withLoading, $ } from '../ui.js';

const INTERESTS = ['Beach', 'Mountain', 'Heritage', 'Nature', 'Adventure', 'Spiritual', 'City', 'Honeymoon', 'Family'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

export function plannerPage(root) {
  const nextMonth = MONTHS[(new Date().getMonth() + 1) % 12];
  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <h1>✨ Smart Trip Planner</h1>
        <p>Tell us about your dream trip and get personalised package recommendations instantly.</p>
      </div>
    </section>
    <section class="section container detail-layout planner-layout">
      <aside class="panel sticky">
        <form class="form" id="plannerForm">
          <div class="field"><label>Total budget (₹)</label><input type="number" name="budget" min="1000" step="1000" value="60000" required /></div>
          <div class="form-row">
            <div class="field"><label>Travellers</label><input type="number" name="travelers" min="1" max="20" value="2" required /></div>
            <div class="field"><label>Trip length (days)</label><input type="number" name="days" min="1" max="15" value="5" required /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Travel month</label>
              <select name="month">${MONTHS.map((m) => `<option ${m === nextMonth ? 'selected' : ''}>${m}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Where?</label>
              <select name="scope"><option>Any</option><option>India</option><option>International</option></select>
            </div>
          </div>
          <div class="field">
            <label>Interests</label>
            <div class="checkbox-group">
              ${INTERESTS.map((i) => `<label class="chip-check"><input type="checkbox" name="interests" value="${i}"><span>${i}</span></label>`).join('')}
            </div>
          </div>
          <button class="btn btn-accent btn-block" type="submit">Find my perfect trip</button>
        </form>
      </aside>
      <div id="plannerResults">
        ${empty('🧭', 'Fill in your preferences and click <strong>Find my perfect trip</strong> to see recommendations.')}
      </div>
    </section>`;

  const form = $('#plannerForm', root);
  const results = $('#plannerResults', root);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { ...formData(form), interests: [...form.querySelectorAll('[name=interests]:checked')].map((c) => c.value) };
    results.innerHTML = loader();
    await withLoading(form.querySelector('button'), async () => {
      try {
        renderResults(results, await api('/planner', { method: 'POST', body }));
      } catch (err) {
        results.innerHTML = empty('⚠️', esc(err.message));
      }
    }, 'Planning...');
  });
}

function renderResults(container, { recommendations, tips }) {
  container.innerHTML = `
    <div class="panel">
      <h2>💡 Travel tips for you</h2>
      <ul class="list-check">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>
    ${recommendations.length
      ? recommendations.map((r, i) => `
        <article class="card plan-card mt-2">
          <div class="card-media">${imgTag(r.image, r.title)}<span class="card-badge">#${i + 1} Pick</span></div>
          <div class="card-body">
            <div class="flex between">
              <h3>${esc(r.title)}</h3>
              <span class="match">${r.matchScore}% match</span>
            </div>
            <div class="card-meta">
              <span>📍 ${esc(r.destination)}, ${esc(r.country)}</span>
              <span>🗓 ${r.days} days</span>
              <span>🌤 ${esc(r.bestTime)}</span>
            </div>
            <ul class="reason-list">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            <details>
              <summary style="cursor:pointer;color:var(--primary)">View suggested itinerary</summary>
              <ol style="font-size:.9rem;color:var(--muted)">
                ${r.itinerary.map((d) => `<li><strong>${esc(d.title)}</strong> – ${esc(d.desc)}</li>`).join('')}
              </ol>
            </details>
            <div class="card-foot">
              <span class="price">${inr(r.totalEstimate)} <small>est. total incl. GST</small></span>
              <a class="btn btn-primary btn-sm" href="#/package/${esc(r.packageId)}">Book this trip</a>
            </div>
          </div>
        </article>`).join('')
      : empty('😕', 'No packages fit these preferences. Try increasing your budget or changing the trip length.')}`;
}
