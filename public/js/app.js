// Application entry point: registers routes, renders the navbar and handles navigation.
import { api, auth } from './api.js';
import { route, resolve, setNotFound } from './router.js';
import { $, $$, esc, toast, closeModal, empty } from './ui.js';

import { homePage } from './pages/home.js';
import { destinationsPage, destinationDetailPage } from './pages/destinations.js';
import { packagesPage, packageDetailPage } from './pages/packages.js';
import { plannerPage } from './pages/planner.js';
import { loginPage, registerPage } from './pages/auth.js';
import { bookingsPage, wishlistPage, profilePage } from './pages/account.js';
import { contactPage, aboutPage } from './pages/contact.js';
import { adminPage } from './pages/admin.js';

/* --------------------------------- Routes --------------------------------- */

route('/', homePage, { nav: 'home', title: 'Home' });
route('/destinations', destinationsPage, { nav: 'destinations', title: 'Destinations' });
route('/destination/:id', destinationDetailPage, { nav: 'destinations', title: 'Destination' });
route('/packages', packagesPage, { nav: 'packages', title: 'Tour Packages' });
route('/package/:id', packageDetailPage, { nav: 'packages', title: 'Package' });
route('/planner', plannerPage, { nav: 'planner', title: 'Smart Trip Planner' });
route('/contact', contactPage, { nav: 'contact', title: 'Contact' });
route('/about', aboutPage, { title: 'About' });
route('/login', loginPage, { title: 'Login' });
route('/register', registerPage, { title: 'Sign up' });
route('/bookings', bookingsPage, { auth: true, title: 'My Bookings' });
route('/wishlist', wishlistPage, { auth: true, title: 'Wishlist' });
route('/profile', profilePage, { auth: true, title: 'Profile' });
route('/admin', adminPage, { admin: true, title: 'Admin Dashboard' });

setNotFound((root) => {
  root.innerHTML = empty('🧭', 'Oops! This page does not exist.', '<a class="btn btn-primary" href="#/">Go home</a>');
});

/* --------------------------------- Navbar --------------------------------- */

function renderAuthLinks() {
  const box = $('#authLinks');
  const user = auth.user;
  if (!user) {
    box.innerHTML = `
      <a href="#/login" class="btn btn-light btn-sm">Log in</a>
      <a href="#/register" class="btn btn-primary btn-sm">Sign up</a>`;
    return;
  }
  box.innerHTML = `
    <div class="user-chip">
      <button id="userMenuBtn">👤 ${esc(user.name.split(' ')[0])} ▾</button>
      <div class="dropdown" id="userMenu">
        ${user.role === 'admin' ? '<a href="#/admin">📊 Admin Dashboard</a>' : ''}
        <a href="#/bookings">🧾 My Bookings</a>
        <a href="#/wishlist">❤️ Wishlist</a>
        <a href="#/profile">⚙️ Profile</a>
        <button id="logoutBtn">🚪 Log out</button>
      </div>
    </div>`;
  $('#userMenuBtn').onclick = (e) => {
    e.stopPropagation();
    $('#userMenu').classList.toggle('open');
  };
  $('#logoutBtn').onclick = () => {
    auth.clear();
    toast('You have been logged out', 'success');
    location.hash = '#/';
  };
}

/* ------------------------------- Navigation ------------------------------- */

async function navigate() {
  const app = $('#app');
  const match = resolve();

  if ((match.auth || match.admin) && !auth.isLoggedIn) {
    try { sessionStorage.setItem('wl_redirect', location.hash); } catch { /* ignore */ }
    toast('Please log in to continue', 'error');
    location.hash = '#/login';
    return;
  }
  if (match.admin && !auth.isAdmin) {
    toast('Admin access only', 'error');
    location.hash = '#/';
    return;
  }

  // A fresh container per page so event listeners from old pages are discarded.
  const root = document.createElement('div');
  app.replaceChildren(root);

  closeModal();
  $('#navLinks').classList.remove('open');
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === match.nav));
  document.title = `${match.title || 'Page not found'} | Wanderlust Travel Portal`;
  window.scrollTo({ top: 0 });

  try {
    await match.handler(root, match.params);
  } catch (err) {
    console.error(err);
    root.innerHTML = empty('⚠️', `Something went wrong: ${esc(err.message)}`);
  }
}

/* --------------------------------- Startup -------------------------------- */

function init() {
  $('#year').textContent = new Date().getFullYear();
  $('#navToggle').onclick = () => $('#navLinks').classList.toggle('open');
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('click', () => $('#userMenu')?.classList.remove('open'));

  $('#newsletterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { message } = await api('/newsletter', { method: 'POST', body: { email: e.target.email.value } });
      toast(message, 'success');
      e.target.reset();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  auth.onChange(renderAuthLinks);
  renderAuthLinks();

  // Refresh the stored user (wishlist, role) from the server if logged in.
  if (auth.token) {
    api('/auth/me').then(({ user }) => auth.set(null, user)).catch(() => {});
  }

  window.addEventListener('hashchange', navigate);
  navigate();
}

init();
