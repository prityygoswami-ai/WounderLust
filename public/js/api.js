// API client + authentication state (token stored in localStorage).
const TOKEN_KEY = 'wl_token';
const USER_KEY = 'wl_user';

const listeners = new Set();

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
}

export const auth = {
  get token() { return readStorage(TOKEN_KEY); },
  get user() {
    try { return JSON.parse(readStorage(USER_KEY)); } catch { return null; }
  },
  get isLoggedIn() { return Boolean(this.token && this.user); },
  get isAdmin() { return this.user?.role === 'admin'; },
  set(token, user) {
    if (token) writeStorage(TOKEN_KEY, token);
    writeStorage(USER_KEY, JSON.stringify(user));
    listeners.forEach((fn) => fn(user));
  },
  clear() {
    writeStorage(TOKEN_KEY, null);
    writeStorage(USER_KEY, null);
    listeners.forEach((fn) => fn(null));
  },
  onChange(fn) { listeners.add(fn); }
};

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null));
    if ([...params].length) url += `?${params}`;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Network error. Please check your connection.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth.token) auth.clear();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
