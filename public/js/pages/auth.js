import { api, auth } from '../api.js';
import { formData, withLoading, toast, $ } from '../ui.js';

function redirectAfterLogin() {
  let target = '#/';
  try {
    target = sessionStorage.getItem('wl_redirect') || (auth.isAdmin ? '#/admin' : '#/');
    sessionStorage.removeItem('wl_redirect');
  } catch { /* ignore */ }
  location.hash = target;
}

export function loginPage(root) {
  if (auth.isLoggedIn) { location.hash = '#/'; return; }
  root.innerHTML = `
    <section class="auth-wrap container">
      <div class="auth-card">
        <h1>Welcome back 👋</h1>
        <p class="muted">Log in to book trips and manage your bookings.</p>
        <form class="form" id="loginForm">
          <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email" /></div>
          <div class="field"><label>Password</label><input type="password" name="password" required autocomplete="current-password" /></div>
          <p class="form-error" id="loginError"></p>
          <button class="btn btn-primary btn-block" type="submit">Log in</button>
        </form>
        <p class="demo-hint mt-2">🔑 Demo admin: <strong>admin@wanderlust.com</strong> / <strong>admin123</strong></p>
        <p class="center">New here? <a href="#/register">Create an account</a></p>
      </div>
    </section>`;

  const form = $('#loginForm', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await withLoading(form.querySelector('button'), async () => {
      try {
        const { token, user } = await api('/auth/login', { method: 'POST', body: formData(form) });
        auth.set(token, user);
        toast(`Welcome back, ${user.name}!`, 'success');
        redirectAfterLogin();
      } catch (err) {
        $('#loginError', root).textContent = err.message;
      }
    });
  });
}

export function registerPage(root) {
  if (auth.isLoggedIn) { location.hash = '#/'; return; }
  root.innerHTML = `
    <section class="auth-wrap container">
      <div class="auth-card">
        <h1>Create account ✈️</h1>
        <p class="muted">Join Wanderlust and start exploring.</p>
        <form class="form" id="registerForm">
          <div class="field"><label>Full name</label><input name="name" required autocomplete="name" /></div>
          <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email" /></div>
          <div class="field"><label>Phone</label><input name="phone" placeholder="10-digit mobile" autocomplete="tel" /></div>
          <div class="form-row">
            <div class="field"><label>Password</label><input type="password" name="password" minlength="6" required autocomplete="new-password" /></div>
            <div class="field"><label>Confirm</label><input type="password" name="confirm" minlength="6" required autocomplete="new-password" /></div>
          </div>
          <p class="form-error" id="registerError"></p>
          <button class="btn btn-primary btn-block" type="submit">Sign up</button>
        </form>
        <p class="center">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </section>`;

  const form = $('#registerForm', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    if (data.password !== data.confirm) {
      $('#registerError', root).textContent = 'Passwords do not match';
      return;
    }
    delete data.confirm;
    await withLoading(form.querySelector('button'), async () => {
      try {
        const { token, user } = await api('/auth/register', { method: 'POST', body: data });
        auth.set(token, user);
        toast('Account created successfully!', 'success');
        redirectAfterLogin();
      } catch (err) {
        $('#registerError', root).textContent = err.message;
      }
    });
  });
}
