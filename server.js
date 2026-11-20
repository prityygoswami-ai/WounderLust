// Local development server: serves /public as static files and /api/* through the shared router.
// Run with:  node server.js   ->   http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./lib/router');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath)) filePath = path.join(PUBLIC_DIR, 'index.html'); // SPA fallback

  res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/') || req.url === '/api') return handle(req, res);
    return serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`Wanderlust Travel Portal running at http://localhost:${PORT}`);
  });
