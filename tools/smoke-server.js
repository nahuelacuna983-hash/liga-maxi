const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8790);
const publicFiles = new Set([
  'index_online.html', 'app_online.js', 'style.css', 'manifest.json',
  'sw.js', 'icon-192.png', 'icon-512.png'
]);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function createServer() {
  return http.createServer((req, res) => {
    let requestPath;
    try {
      requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }
  const relative = requestPath === '/' ? 'index_online.html' : requestPath.replace(/^\/+/, '');
  if (!publicFiles.has(relative) || relative.includes('/') || relative.includes('\\')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const file = path.join(root, relative);
  fs.realpath(file, (realpathError, resolvedFile) => {
    if (realpathError || resolvedFile !== file) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    fs.stat(file, (statError, stats) => {
      if (statError || !stats.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      fs.readFile(file, (error, data) => {
        if (error) {
          res.writeHead(500);
          res.end('Server error');
          return;
        }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
  });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`SMOKE_SERVER_READY ${port}\n`);
  });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

module.exports = { createServer };
