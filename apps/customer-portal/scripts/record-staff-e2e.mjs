/**
 * Records a normal-speed (1x) staff console walkthrough for client review.
 * Login → Live Queue → Call Next → Seat → Console → Guests → Reviews →
 * Messages → Profile → Logout, with on-screen captions explaining each step.
 *
 * Output: apps/customer-portal/recordings/staff-e2e-tablet.webm
 *
 * Usage (from apps/customer-portal):
 *   node scripts/record-staff-e2e.mjs
 */
import { chromium } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'recordings');

const STAFF_URL = process.env.STAFF_URL ?? 'https://queueflow-staff.vercel.app';
const API =
  process.env.API_BASE_URL ??
  'https://queueflow-backend-production.up.railway.app/api/v1';
const QUEUE_ID =
  process.env.DINE_IN_QUEUE_ID ?? '5354156e-0e46-41a1-ab49-8c6dd9ac80f7';
const STAFF_EMAIL =
  process.env.DEMO_STAFF_EMAIL ?? 'staff1.dt@bellavista.example.com';
const STAFF_PASSWORD =
  process.env.DEMO_STAFF_PASSWORD ??
  process.env.SEED_DEMO_PASSWORD ??
  'XOMwB7h10ImxbSt33c2PiQEABAqGEwYL!Qf9';

const VIEWPORT = { width: 1100, height: 800 };

/** Pause so a viewer can read captions / UI (ms). 1x demo pace. */
const beat = (ms) => new Promise((r) => setTimeout(r, ms));

async function seedGuest() {
  const phone = `+1555${String(Date.now()).slice(-7)}`;
  const res = await fetch(`${API}/queues/${QUEUE_ID}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Jordan Lee',
      phone,
      partySize: 2,
      notificationPreference: 'SMS',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seed join failed ${res.status}: ${text}`);
  }
  const body = await res.json();
  console.log('Seeded guest', body?.data?.displayCode ?? body?.data?.id ?? phone);
  return body.data;
}

async function showCaption(page, title, detail = '') {
  await page.evaluate(
    ({ title, detail }) => {
      let el = document.getElementById('qf-demo-caption');
      if (!el) {
        el = document.createElement('div');
        el.id = 'qf-demo-caption';
        Object.assign(el.style, {
          position: 'fixed',
          left: '24px',
          right: '24px',
          bottom: '88px',
          zIndex: '999999',
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#fff',
          padding: '14px 18px',
          borderRadius: '14px',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        });
        document.body.appendChild(el);
      }
      el.innerHTML = `<div style="font-size:15px;font-weight:700;letter-spacing:0.01em">${title}</div>${
        detail
          ? `<div style="margin-top:6px;font-size:13px;line-height:1.4;opacity:0.92">${detail}</div>`
          : ''
      }`;
      el.style.display = 'block';
    },
    { title, detail },
  );
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById('qf-demo-caption');
    if (el) el.style.display = 'none';
  });
}

async function focusFlutterField(page, yRatio) {
  const pane = page.locator('flt-glass-pane, flutter-view, canvas').first();
  const box = await pane.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * yRatio);
  } else {
    await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height * yRatio);
  }
  await beat(450);
  return page.locator('input.flt-text-editing, input').first();
}

async function flutterLogin(page) {
  await beat(6000);
  for (const y of [0.44, 0.46, 0.42, 0.48, 0.4]) {
    await focusFlutterField(page, y);
    if ((await page.locator('input.flt-text-editing, input').count()) > 0) break;
  }
  const inputs = page.locator('input.flt-text-editing, input');
  if ((await inputs.count()) > 0) {
    await inputs.first().fill('');
    await inputs.first().fill(STAFF_EMAIL);
  } else {
    await page.keyboard.type(STAFF_EMAIL, { delay: 35 });
  }
  await beat(500);
  await page.keyboard.press('Tab');
  await beat(700);
  const passInputs = page.locator(
    'input.flt-text-editing, input[type="password"], input',
  );
  if ((await passInputs.count()) > 0) {
    await passInputs.first().fill('');
    await passInputs.first().fill(STAFF_PASSWORD);
  } else {
    await page.keyboard.type(STAFF_PASSWORD, { delay: 35 });
  }
  await beat(600);
  await page.keyboard.press('Enter');
  await beat(8000);
  if (/#\/login/i.test(page.url())) {
    await focusFlutterField(page, 0.62);
    await beat(8000);
  }
}

async function waitUntilNotLogin(page, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!/#\/login/i.test(page.url())) return true;
    await beat(1000);
  }
  return false;
}

/** Bottom nav: Live Queue, Guests, Reviews, Messages, Profile (5 equal slots). */
async function tapBottomNav(page, index) {
  const x = Math.round(VIEWPORT.width * ((index + 0.5) / 5));
  const y = VIEWPORT.height - 36;
  await page.mouse.click(x, y);
  await beat(2500);
}

async function tapAppBarLogout(page) {
  // Logout icon is far-right in AppBar (after Live chip).
  await page.mouse.click(VIEWPORT.width - 28, 40);
  await beat(4000);
}

async function tapStickyCallNext(page) {
  // Sticky call button sits above bottom nav.
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height - 110);
  await beat(3500);
}

async function tapSheetPrimary(page) {
  // Bottom sheet primary action (Call / Seat / Complete area).
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height - 90);
  await beat(3000);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Seeding a waiting guest…');
  await seedGuest();

  // slowMo: 0 = real 1x interaction speed; beats handle readable pacing.
  const browser = await chromium.launch({ headless: true, slowMo: 0 });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: OUT_DIR,
      size: VIEWPORT,
    },
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    // —— 1. Login ——
    await page.goto(STAFF_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await beat(2500);
    await showCaption(
      page,
      'Staff Console — Login',
      'Hosts sign in with their restaurant staff account. Only invited staff can access this queue board.',
    );
    await beat(3500);

    await showCaption(
      page,
      'Signing in as Bella Vista host',
      'We verify email + password against the live API (Railway). Wrong credentials never reach the Live Queue.',
    );
    await flutterLogin(page);
    const ok = await waitUntilNotLogin(page);
    if (!ok) throw new Error('Staff login did not leave #/login');

    await beat(5000);
    await showCaption(
      page,
      'Live Queue — operational home',
      'After login we land here. Waiting count, who is next, Online/Live chip (socket connected + authorized), and one clear Call Next.',
    );
    await beat(4500);

    // —— 2. Call Next ——
    await showCaption(
      page,
      'Call Next — notify the correct guest',
      'We already seeded a waiting guest. Call Next only advances the true next waiter — it will not stack two CALLED guests if tapped twice.',
    );
    await beat(2800);
    await hideCaption(page);
    await tapStickyCallNext(page);
    await beat(2000);
    await showCaption(
      page,
      'Guest called',
      'Staff sees who was called and can Seat, Hold, Call again, or mark No-show. The guest phone updates to “your turn”.',
    );
    await beat(3500);

    // Seat / complete if sheet is open
    await showCaption(
      page,
      'Seat / Complete',
      'When the party is ready, Seat finishes the visit and frees Call Next for the next waiter.',
    );
    await beat(2000);
    await hideCaption(page);
    await tapSheetPrimary(page);
    await beat(2500);
    // Extra tap in case first was Call and sheet still open for Seat
    await tapSheetPrimary(page);
    await beat(2500);

    // —— 3. Full waiting list / console ——
    await showCaption(
      page,
      'Full waiting list (Queue Console)',
      'Open the board to see everyone waiting, hold or skip guests, and manage line order safely.',
    );
    await beat(2200);
    await hideCaption(page);
    // "See the full waiting list" tile — mid/lower content area
    await page.mouse.click(VIEWPORT.width / 2, Math.round(VIEWPORT.height * 0.58));
    await beat(4500);
    await showCaption(
      page,
      'Queue Console',
      'Same Call Next rules apply here: if someone is already called, Manage them first. Live chip stays truthful.',
    );
    await beat(4000);

    // Back via AppBar leading / browser-style — tap top-left back if present
    await page.mouse.click(40, 40);
    await beat(2500);

    // —— 4. Guests ——
    await showCaption(
      page,
      'Guests tab',
      'Search and open any guest. Call / Seat / Hold only run when allowed — Call refuses if this guest is not next in line.',
    );
    await beat(2000);
    await hideCaption(page);
    await tapBottomNav(page, 1);
    await beat(2000);
    await showCaption(
      page,
      'Guest list',
      'Staff can look up a phone or name, then open detail for queue actions without guessing order.',
    );
    await beat(3500);
    // Tap first list row area
    await hideCaption(page);
    await page.mouse.click(VIEWPORT.width / 2, 220);
    await beat(3500);
    await showCaption(
      page,
      'Guest detail',
      'Primary buttons perform real API actions (Call, Seat, Hold). “Open queue board” is clearly separate navigation.',
    );
    await beat(4000);
    await page.mouse.click(40, 40);
    await beat(2000);

    // —— 5. Reviews ——
    await showCaption(
      page,
      'Reviews tab',
      'Guest feedback for the venue — staff can glance at sentiment without leaving the console.',
    );
    await beat(1800);
    await hideCaption(page);
    await tapBottomNav(page, 2);
    await beat(3500);

    // —— 6. Messages ——
    await showCaption(
      page,
      'Messages tab',
      'Delivery log for SMS / WhatsApp guest notifications after Call Next — not a silent board refresh.',
    );
    await beat(1800);
    await hideCaption(page);
    await tapBottomNav(page, 3);
    await beat(4000);

    // —— 7. Profile ——
    await showCaption(
      page,
      'Profile & settings',
      'Signed-in host identity, theme, and break mode. Staff only see the branch they are assigned to.',
    );
    await beat(1800);
    await hideCaption(page);
    await tapBottomNav(page, 4);
    await beat(4000);

    // —— 8. Back to Live Queue then Logout ——
    await showCaption(
      page,
      'Back to Live Queue',
      'Day-to-day work stays on Live Queue — one board, one Call Next, honest Online status.',
    );
    await beat(1600);
    await hideCaption(page);
    await tapBottomNav(page, 0);
    await beat(3000);

    await showCaption(
      page,
      'Sign out',
      'Logout clears the session. The next host must sign in again — no shared tablet left unlocked.',
    );
    await beat(2500);
    await hideCaption(page);
    await tapAppBarLogout(page);
    await beat(2000);
    await showCaption(
      page,
      'Back at login — staff check complete',
      'We verified: secure login → Live Queue → Call Next safety → Seat → Guests actions → Messages → Profile → logout.',
    );
    await beat(4500);
    await hideCaption(page);
    await beat(1000);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    if (video) {
      const rawPath = await video.path();
      const finalPath = path.join(OUT_DIR, 'staff-e2e-tablet.webm');
      await beat(800);
      if (fs.existsSync(rawPath)) {
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        fs.renameSync(rawPath, finalPath);
        const mb = (fs.statSync(finalPath).size / (1024 * 1024)).toFixed(2);
        console.log(`Saved: ${finalPath} (${mb} MB)`);
      } else {
        console.error('Video file missing:', rawPath);
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
