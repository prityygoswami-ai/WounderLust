import { api, auth } from '../api.js';
import { queryParams } from '../router.js';
import { esc, formData, withLoading, toast, $ } from '../ui.js';

export function contactPage(root) {
  const { subject = '' } = queryParams();
  const u = auth.user || {};
  root.innerHTML = `
    <section class="page-header"><div class="container"><h1>Contact Us</h1><p>Questions, custom trips or support — we're here to help.</p></div></section>
    <section class="section container detail-layout">
      <div class="panel">
        <h2>Send us a message</h2>
        <form class="form" id="contactForm">
          <div class="form-row">
            <div class="field"><label>Name</label><input name="name" value="${esc(u.name || '')}" required /></div>
            <div class="field"><label>Email</label><input type="email" name="email" value="${esc(u.email || '')}" required /></div>
          </div>
          <div class="field"><label>Subject</label><input name="subject" value="${esc(subject)}" required /></div>
          <div class="field"><label>Message</label><textarea name="message" rows="5" required></textarea></div>
          <p class="form-error" id="contactError"></p>
          <button class="btn btn-primary" type="submit">Send message</button>
        </form>
      </div>
      <aside class="panel">
        <h2>Get in touch</h2>
        <p>📍 Wanderlust Travels, MG Road, Bengaluru, India</p>
        <p>📞 +91 98765 43210</p>
        <p>✉️ support@wanderlust.example</p>
        <p>🕘 Mon – Sat, 9:00 AM – 7:00 PM</p>
        <hr style="border:0;border-top:1px solid var(--border)">
        <h3>FAQs</h3>
        <details><summary>Can I cancel my booking?</summary><p class="muted">Yes, from <a href="#/bookings">My Bookings</a>. Paid bookings receive a refund.</p></details>
        <details><summary>Is there a group discount?</summary><p class="muted">Yes! 10% off on bookings of 5 or more travellers.</p></details>
        <details><summary>Are taxes included?</summary><p class="muted">5% GST is added and shown clearly before payment.</p></details>
      </aside>
    </section>`;

  const form = $('#contactForm', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await withLoading(form.querySelector('button'), async () => {
      try {
        const { message } = await api('/contact', { method: 'POST', body: formData(form) });
        toast(message, 'success');
        form.message.value = '';
        form.subject.value = '';
      } catch (err) {
        $('#contactError', root).textContent = err.message;
      }
    }, 'Sending...');
  });
}

export function aboutPage(root) {
  root.innerHTML = `
    <section class="page-header"><div class="container"><h1>About Wanderlust</h1><p>Making travel planning simple, transparent and joyful.</p></div></section>
    <section class="section container" style="max-width:860px">
      <div class="panel">
        <h2>Our story</h2>
        <p>Wanderlust is a tourism and travel portal that helps travellers discover destinations, compare
          tour packages, plan trips within their budget and book in minutes. It was built as an
          <strong>AI-assisted web application project</strong>, using prompt engineering to plan, design,
          generate, test and document every part of the system.</p>
      </div>
      <div class="features">
        <div class="feature"><div class="icon">🗺️</div><h3>Discover</h3><p>Browse curated destinations with highlights and best travel seasons.</p></div>
        <div class="feature"><div class="icon">🧳</div><h3>Book</h3><p>Choose a package, pick dates and confirm instantly.</p></div>
        <div class="feature"><div class="icon">✨</div><h3>Plan</h3><p>The Smart Planner matches trips to your budget and interests.</p></div>
      </div>
    </section>`;
}
