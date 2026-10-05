/**
 * Live smoke + latency + light traffic probes for QueueFlow portals/API.
 * node scripts/live-portal-qa-probe.mjs
 */
import http from 'node:http';
import https from 'node:https';

const API =
  process.env.API_BASE_URL ??
  'https://queueflow-backend-production.up.railway.app/api/v1';
const PASS =
  process.env.SEED_DEMO_PASSWORD ??
  'XOMwB7h10ImxbSt33c2PiQEABAqGEwYL!Qf9';
const QUEUE_ID =
  process.env.DINE_IN_QUEUE_ID ?? '5354156e-0e46-41a1-ab49-8c6dd9ac80f7';

const portals = [
  { name: 'customer-portal', url: 'http://localhost:3011' },
  { name: 'staff', url: 'http://localhost:8081' },
  { name: 'business', url: 'http://localhost:8082' },
  { name: 'tv', url: 'http://localhost:8083' },
  { name: 'admin', url: 'http://localhost:8084' },
  { name: 'marketing', url: 'http://localhost:8085' },
];

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const started = Date.now();
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers,
        timeout: 45000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* ignore */
          }
          resolve({
            ok: (res.statusCode ?? 500) < 400,
            status: res.statusCode,
            ms: Date.now() - started,
            json,
            text: text.slice(0, 200),
            headers: res.headers,
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: Date.now() - started, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        ms: Date.now() - started,
        error: String(err.message || err),
      });
    });
    if (body) req.write(body);
    req.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function timeMany(label, fn, n = 10) {
  const samples = [];
  let fails = 0;
  for (let i = 0; i < n; i++) {
    const r = await fn();
    samples.push(r.ms);
    if (!r.ok) fails += 1;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    label,
    n,
    fails,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

const results = {
  generatedAt: new Date().toISOString(),
  smoke: [],
  negatives: [],
  positives: [],
  latency: [],
  load: [],
};

console.log('=== Portal page smoke ===');
for (const p of portals) {
  const r = await request(p.url);
  const row = {
    name: p.name,
    url: p.url,
    ok: r.ok,
    status: r.status,
    ms: r.ms,
    error: r.error,
  };
  results.smoke.push(row);
  console.log(
    `${row.ok ? 'PASS' : 'FAIL'} ${p.name} ${r.status || r.error} ${r.ms}ms`,
  );
}

console.log('\n=== API smoke / auth ===');
const health = await request(`${API}/health`);
results.smoke.push({
  name: 'api-health',
  ok: health.ok,
  status: health.status,
  ms: health.ms,
  detail: health.json?.data?.status ?? health.error,
});
console.log(
  `${health.ok ? 'PASS' : 'FAIL'} health ${health.status} ${health.ms}ms ${health.json?.data?.status ?? ''}`,
);

const live = await request(`${API}/health/live`);
results.smoke.push({
  name: 'api-live',
  ok: live.ok,
  status: live.status,
  ms: live.ms,
});
console.log(`${live.ok ? 'PASS' : 'FAIL'} live ${live.status} ${live.ms}ms`);

const snap = await request(`${API}/queues/${QUEUE_ID}/snapshot`);
results.smoke.push({
  name: 'queue-snapshot',
  ok: snap.ok,
  status: snap.status,
  ms: snap.ms,
  waiting: snap.json?.data?.entries?.filter?.((e) => e.status === 'WAITING')?.length,
});
console.log(
  `${snap.ok ? 'PASS' : 'FAIL'} snapshot ${snap.status} ${snap.ms}ms waiting≈${results.smoke.at(-1).waiting ?? '?'}`,
);

async function login(email, password) {
  const body = JSON.stringify({ email, password });
  return request(`${API}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });
}

const logins = [
  ['staff', 'staff1.dt@bellavista.example.com', PASS],
  ['owner', 'owner@bellavista.example.com', PASS],
  ['admin', 'ops@queueflow.app', PASS],
];

for (const [role, email, password] of logins) {
  const r = await login(email, password);
  const row = {
    name: `login-${role}`,
    ok: r.ok && !!r.json?.data?.accessToken,
    status: r.status,
    ms: r.ms,
  };
  results.positives.push(row);
  console.log(`${row.ok ? 'PASS' : 'FAIL'} login ${role} ${r.status} ${r.ms}ms`);
}

console.log('\n=== Negative auth ===');
const badPass = await login('staff1.dt@bellavista.example.com', 'wrong-password-!!!');
results.negatives.push({
  name: 'login-bad-password',
  ok: !badPass.ok && (badPass.status === 401 || badPass.status === 403),
  status: badPass.status,
  ms: badPass.ms,
});
console.log(
  `${results.negatives.at(-1).ok ? 'PASS' : 'FAIL'} bad password → ${badPass.status}`,
);

const missing = await login('', '');
results.negatives.push({
  name: 'login-empty',
  ok: !missing.ok,
  status: missing.status,
  ms: missing.ms,
});
console.log(
  `${results.negatives.at(-1).ok ? 'PASS' : 'FAIL'} empty login → ${missing.status}`,
);

const noAuthSnapStaff = await request(`${API}/queues/${QUEUE_ID}/metrics`);
results.negatives.push({
  name: 'metrics-without-auth',
  ok: !noAuthSnapStaff.ok && (noAuthSnapStaff.status === 401 || noAuthSnapStaff.status === 403),
  status: noAuthSnapStaff.status,
  ms: noAuthSnapStaff.ms,
});
console.log(
  `${results.negatives.at(-1).ok ? 'PASS' : 'FAIL'} metrics no auth → ${noAuthSnapStaff.status}`,
);

const bogusJoin = await request(`${API}/queues/00000000-0000-4000-8000-000000000000/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'QA Probe',
    phone: '+920000000000',
    partySize: 2,
  }),
});
results.negatives.push({
  name: 'join-missing-queue',
  ok: !bogusJoin.ok,
  status: bogusJoin.status,
  ms: bogusJoin.ms,
});
console.log(
  `${results.negatives.at(-1).ok ? 'PASS' : 'FAIL'} join missing queue → ${bogusJoin.status}`,
);

console.log('\n=== Latency samples (API) ===');
results.latency.push(
  await timeMany('health/live x10', () => request(`${API}/health/live`), 10),
);
results.latency.push(
  await timeMany(
    'queue snapshot x8',
    () => request(`${API}/queues/${QUEUE_ID}/snapshot`),
    8,
  ),
);
results.latency.push(
  await timeMany(
    'staff login x5',
    () => login('staff1.dt@bellavista.example.com', PASS),
    5,
  ),
);
for (const row of results.latency) {
  console.log(
    `${row.label}: min=${row.min} p50=${row.p50} p95=${row.p95} max=${row.max} fails=${row.fails}/${row.n}`,
  );
}

console.log('\n=== Light traffic (concurrent) ===');
async function burst(label, fn, concurrency = 20) {
  const started = Date.now();
  const settled = await Promise.all(Array.from({ length: concurrency }, () => fn()));
  const ms = Date.now() - started;
  const fails = settled.filter((r) => !r.ok).length;
  const times = settled.map((r) => r.ms).sort((a, b) => a - b);
  const row = {
    label,
    concurrency,
    wallMs: ms,
    fails,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: times[times.length - 1],
  };
  results.load.push(row);
  console.log(
    `${label}: wall=${ms}ms fails=${fails}/${concurrency} p50=${row.p50} p95=${row.p95} max=${row.max}`,
  );
}

await burst('20x health/live', () => request(`${API}/health/live`), 20);
await burst(
  '15x queue snapshot',
  () => request(`${API}/queues/${QUEUE_ID}/snapshot`),
  15,
);
await burst('10x portal home', () => request('http://localhost:3011'), 10);

const cors = await request(`${API}/health/live`, {
  method: 'OPTIONS',
  headers: {
    Origin: 'http://localhost:8081',
    'Access-Control-Request-Method': 'GET',
  },
});
results.positives.push({
  name: 'cors-localhost-staff',
  ok: cors.status === 204 || cors.status === 200,
  status: cors.status,
  ms: cors.ms,
  acao: cors.headers?.['access-control-allow-origin'],
});
console.log(
  `\n${results.positives.at(-1).ok ? 'PASS' : 'FAIL'} CORS localhost:8081 → ${cors.status} acao=${cors.headers?.['access-control-allow-origin']}`,
);

const passCount = [...results.smoke, ...results.positives, ...results.negatives].filter(
  (r) => r.ok,
).length;
const totalCount = results.smoke.length + results.positives.length + results.negatives.length;
results.summary = {
  checksPass: passCount,
  checksTotal: totalCount,
  portalPagesUp: results.smoke.filter((s) => portals.some((p) => p.name === s.name) && s.ok)
    .length,
  portalPagesTotal: portals.length,
};

console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results.summary, null, 2));

import fs from 'node:fs';
fs.mkdirSync('d:/projects/tamatos-app/queueflow', { recursive: true });
fs.writeFileSync(
  'd:/projects/tamatos-app/queueflow/tmp-live-qa-report.json',
  JSON.stringify(results, null, 2),
);
console.log('Wrote tmp-live-qa-report.json');
