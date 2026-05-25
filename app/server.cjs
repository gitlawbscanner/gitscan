const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

const PORT     = process.env.PORT || 3000;
const DIST     = path.join(__dirname, 'dist');
const DIST_ABS = path.resolve(DIST);

// Backend URL for /api proxy — set at runtime, never baked into the client bundle
const BACKEND = (process.env.BACKEND_URL || 'https://gitscan-production.up.railway.app').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
};

function proxyToBackend(req, res, backendPath) {
  let target;
  try { target = new URL(backendPath, BACKEND); } catch {
    res.writeHead(400); res.end('Bad gateway path'); return;
  }
  const isHttps = target.protocol === 'https:';
  const opts = {
    hostname: target.hostname,
    port:     target.port || (isHttps ? 443 : 80),
    path:     target.pathname + target.search,
    method:   req.method,
    headers:  Object.assign({}, req.headers, { host: target.hostname }),
  };
  const transport = isHttps ? https : http;
  const proxyReq = transport.request(opts, proxyRes => {
    // Forward CORS headers so browser doesn't block
    const headers = Object.assign({}, proxyRes.headers, {
      'access-control-allow-origin': '*',
    });
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', err => { res.writeHead(502); res.end('Backend unreachable'); });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  const raw = req.url.split('?')[0].split('#')[0];
  const qs  = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';

  // Proxy /api/* to backend — so VITE_API_URL fallback '/api' always works
  if (raw === '/api' || raw.startsWith('/api/')) {
    const backendPath = raw.replace(/^\/api/, '') || '/';
    return proxyToBackend(req, res, backendPath + qs);
  }

  // Resolve to an absolute path and guard against path traversal
  let filePath;
  try {
    filePath = path.resolve(DIST_ABS, decodeURIComponent(raw).replace(/\\/g, '/').replace(/^\/+/, ''));
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }

  if (!filePath.startsWith(DIST_ABS + path.sep) && filePath !== DIST_ABS) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath);
  if (!ext) {
    const htmlPath = filePath + '.html';
    filePath = fs.existsSync(htmlPath) ? htmlPath : path.join(DIST_ABS, 'index.html');
  } else if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_ABS, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`gitscan frontend on :${PORT} — proxying /api/* → ${BACKEND}`);
});
