// Minimal hash-based router: "#/package/goa-beach-escape" -> route "/package/:id".
const routes = [];
let notFound = () => '<p>Page not found</p>';

export function route(pattern, handler, options = {}) {
  const keys = (pattern.match(/:(\w+)/g) || []).map((k) => k.slice(1));
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$');
  routes.push({ pattern, regex, keys, handler, ...options });
}

export function setNotFound(handler) {
  notFound = handler;
}

export function currentPath() {
  return (location.hash.slice(1) || '/').split('?')[0];
}

export function resolve() {
  const path = currentPath();
  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match[i + 1]); });
      return { ...r, params };
    }
  }
  return { handler: notFound, params: {} };
}

export function queryParams() {
  const q = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(q));
}
