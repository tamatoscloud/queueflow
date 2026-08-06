/**
 * Checks E2E prerequisites and prints actionable fixes.
 * Usage: npm run test:e2e:preflight
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';
const portalBase = process.env.BASE_URL ?? 'http://localhost:3001';
const root = apiBase.replace(/\/api\/v1\/?$/, '');

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

async function main() {
  console.log('QueueFlow E2E preflight\n');

  try {
    const res = await fetch(`${root}/api/v1/health/live`);
    if (res.ok) ok(`Backend reachable (${root})`);
    else fail(`Backend returned ${res.status} — run: cd backend; npm run dev`);
  } catch {
    fail(`Backend not reachable at ${root} — run: cd backend; npm run dev`);
  }

  try {
    const res = await fetch(portalBase, { signal: AbortSignal.timeout(8000) });
    if (res.ok || (res.status >= 300 && res.status < 500)) {
      ok(`Customer portal reachable (${portalBase})`);
    } else {
      fail(`Customer portal returned ${res.status} — check portal logs`);
    }
  } catch {
    fail(
      `Customer portal not reachable at ${portalBase} — run: cd apps/customer-portal; npm run dev`,
    );
  }

  const manifestPath = path.resolve(process.cwd(), '../../docs/demo/bella-vista-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail('Manifest missing — run demo:reset in backend/');
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const modes = manifest.serviceModes;
    if (modes?.DINE_IN?.queueId && modes?.TAKEAWAY?.queueId && modes?.DRIVE_IN?.queueId) {
      ok('Manifest has all three service-mode queue IDs');
    } else {
      fail(
        'Manifest is outdated (no serviceModes). Run:\n' +
          '  cd ..\\..\\backend\n' +
          '  $env:SEED_DEMO_PASSWORD = "your-password"\n' +
          '  $env:CUSTOMER_PORTAL_URL = "http://localhost:3001"\n' +
          '  npm run demo:reset',
      );
    }
  }

  const password = process.env.DEMO_STAFF_PASSWORD ?? process.env.SEED_DEMO_PASSWORD;
  if (!password) {
    fail('Set DEMO_STAFF_PASSWORD or SEED_DEMO_PASSWORD before running E2E');
  } else {
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.DEMO_STAFF_EMAIL ?? 'owner@bellavista.example.com',
          password,
        }),
      });
      if (res.ok) ok('Staff login works');
      else fail(`Staff login failed (${res.status}) — check SEED_DEMO_PASSWORD matches seeded data`);
    } catch {
      fail('Staff login request failed');
    }
  }

  console.log('');
  if (failed) {
    console.error('Preflight failed. Fix the items above, then run: npm run test:e2e');
    process.exit(1);
  }
  console.log('Ready. Run: npm run test:e2e');
}

main();
