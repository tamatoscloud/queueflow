/**
 * Local CORS bridge → Railway API for Flutter web on localhost.
 * Usage: node scripts/local-cors-api-proxy.mjs
 */
import http from 'node:http';
import https from 'node:https';

const TARGET_HOST =
  process.env.API_PROXY_HOST ??
  'queueflow-backend-production.up.railway.app';
const PORT = Number(process.env.PORT ?? 3010);

function corsHeaders(req) {
  const origin = req.headers.origin || '*';
  const requestHeaders =
    req.headers['access-control-request-headers'] ||
    'Authorization,Content-Type,Accept,X-Requested-With,X-Request-Id';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': requestHeaders,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'X-Request-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Upstream CORS headers break browsers when duplicated — strip them. */
function sanitizeUpstreamHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase().startsWith('access-control-')) continue;
    if (key.toLowerCase() === 'vary') continue;
    out[key] = value;
  }
  return out;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  const headers = { ...req.headers, host: TARGET_HOST };
  delete headers['accept-encoding'];

  const upstream = https.request(
    {
      hostname: TARGET_HOST,
      path: req.url,
      method: req.method,
      headers,
    },
    (up) => {
      const outHeaders = {
        ...sanitizeUpstreamHeaders(up.headers),
        ...corsHeaders(req),
      };
      res.writeHead(up.statusCode ?? 502, outHeaders);
      up.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    res.writeHead(502, {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ success: false, error: String(err) }));
  });

  req.pipe(upstream);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `CORS API proxy listening on http://localhost:${PORT} → https://${TARGET_HOST}`,
  );
});
