import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolvePath(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const requested = safePath === '' ? 'index.html' : safePath;
  return join(dist, requested);
}

createServer((req, res) => {
  const requestPath = req.url ? req.url.split('?')[0] : '/';

  if (requestPath === '/proxy') {
    if (process.env.ENABLE_MEDIA_PROXY !== 'true') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Forbidden: Media proxy is disabled');
      return;
    }
    import('./scripts/media-proxy.mjs').then(({ handleProxyRequest }) => {
      handleProxyRequest(req, res);
    }).catch((err) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Internal server error: ${err.message}`);
    });
    return;
  }

  let filePath = resolvePath(requestPath);

  if (requestPath === '/' || requestPath === '') {
    filePath = join(dist, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }

  const fileStat = statSync(filePath);
  if (fileStat.isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  const contentType = contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`Smartifly LG dev server running at http://localhost:${port}`);
});
