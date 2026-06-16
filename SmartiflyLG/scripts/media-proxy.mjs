import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

const ALLOWED_HOSTS = process.env.ALLOWED_PROXY_HOSTS
  ? process.env.ALLOWED_PROXY_HOSTS.split(',').map((h) => h.trim().toLowerCase())
  : ['10.20.30.10']; // default whitelist to prevent open proxy

export function rewritePlaylist(body, targetUrl, host) {
  const lines = body.split('\n');
  const proxyBase = `http://${host}/proxy`;

  const rewriteUri = (uri) => {
    try {
      const absoluteUrl = new URL(uri, targetUrl).href;
      return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
    } catch {
      return uri;
    }
  };

  const rewrittenLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return line;
    }

    if (trimmed.startsWith('#')) {
      if (/URI\s*=/i.test(trimmed)) {
        return line.replace(/URI\s*=\s*"([^"]+)"/gi, (match, uri) => {
          return `URI="${rewriteUri(uri)}"`;
        });
      }
      return line;
    }

    return rewriteUri(trimmed);
  });

  return rewrittenLines.join('\n');
}

export function handleProxyRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Origin, Accept, Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const targetUrlStr = reqUrl.searchParams.get('url');

  if (!targetUrlStr) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing url parameter');
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid url parameter');
    return;
  }

  // Security check: restrict proxy to allowed hosts/IPs
  const targetHost = targetUrl.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOSTS.some((host) => targetHost === host || targetHost.endsWith('.' + host));

  if (!isAllowed) {
    console.warn(`[Media Proxy] Blocked request to unauthorized host: ${targetHost}`);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Host is not whitelisted');
    return;
  }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const requestFn = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  const proxyReq = requestFn(
    targetUrl,
    {
      method: req.method,
      headers
    },
    (proxyRes) => {
      const isM3u8 =
        targetUrl.pathname.endsWith('.m3u8') ||
        (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('mpegurl')) ||
        (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('apple.mpegurl'));

      const resHeaders = {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Origin, Accept, Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
      };

      if (isM3u8) {
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });
        proxyRes.on('end', () => {
          const rewrittenBody = rewritePlaylist(body, targetUrl.href, req.headers.host);
          resHeaders['content-type'] = 'application/x-mpegURL';
          resHeaders['content-length'] = Buffer.byteLength(rewrittenBody).toString();
          res.writeHead(proxyRes.statusCode, resHeaders);
          res.end(rewrittenBody);
        });
      } else {
        res.writeHead(proxyRes.statusCode, resHeaders);
        proxyRes.pipe(res);
      }
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
}
