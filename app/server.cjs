const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = process.env.PORT || 3000;
const DIST     = path.join(__dirname, 'dist');
const DIST_ABS = path.resolve(DIST);

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

http.createServer((req, res) => {
  const raw = req.url.split('?')[0].split('#')[0];

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
  console.log(`gitscan frontend running on port ${PORT}`);
});
