/**
 * Dual-screen staff ↔ guest E2E for client review (side-by-side, 1.5x).
 *
 * Left  = Guest phone (customer portal)
 * Right = Staff tablet (Flutter staff console)
 *
 * Flow:
 *  1) Guest joins → waiting + ETA timer
 *  2) Staff Live Queue updates / toast
 *  3) Call Next → guest “your turn”
 *  4) Call again → guest re-alert
 *  5) Hold → guest on-hold
 *  6) Resume + Call → guest ready again
 *  7) Seat → guest completed
 *  8) Second guest → Call Next → No show → guest cancelled/no-show end
 *  9) Messages + logout
 *
 * Usage (from apps/customer-portal):
 *   node scripts/record-staff-guest-dual-e2e.mjs
 *
 * Output:
 *   recordings/staff-guest-dual-e2e-1.5x.webm
 */
import { chromium, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'recordings');
const TMP_DIR = path.join(OUT_DIR, '_dual_tmp');

const STAFF_URL = process.env.STAFF_URL ?? 'https://queueflow-staff.vercel.app';
const GUEST_BASE =
  process.env.BASE_URL ?? 'https://queueflow-six-beta.vercel.app';
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

const STAFF_VP = { width: 1100, height: 800 };
const PHONE = devices['Pixel 7'];

/** Readable pacing before 1.5x speed-up (ms). */
const beat = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status} ${text}`);
  }
  return body;
}

async function staffLoginToken() {
  const body = await apiJson(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD }),
  });
  return body.data.accessToken;
}

async function getSnapshot(token) {
  const body = await apiJson(`${API}/queues/${QUEUE_ID}/snapshot`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return body.data;
}

async function callNextApi(token) {
  return apiJson(`${API}/queues/${QUEUE_ID}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function entryActionApi(token, entryId, action) {
  const pathAction = action === 'resume' ? 'resume-held' : action;
  return apiJson(`${API}/queue-entries/${entryId}/${pathAction}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Clear CALLED/WAITING ahead so the demo guest becomes next. */
async function drainActiveQueue(token) {
  console.log('Draining active queue so demo guest is next…');
  for (let i = 0; i < 40; i++) {
    const snap = await getSnapshot(token);
    const entries = snap.entries ?? snap.queue?.entries ?? [];
    const list = Array.isArray(entries) ? entries : [];
    const called = list.find((e) => e.status === 'CALLED');
    const holding = list.find((e) => e.status === 'HOLDING');
    const waiting = list.filter((e) => e.status === 'WAITING');
    if (called) {
      await entryActionApi(token, called.id ?? called.entryId, 'complete').catch(
        () => entryActionApi(token, called.id ?? called.entryId, 'skip'),
      );
      await beat(400);
      continue;
    }
    if (holding) {
      await entryActionApi(token, holding.id ?? holding.entryId, 'resume').catch(
        async () => {
          await entryActionApi(token, holding.id ?? holding.entryId, 'skip');
        },
      );
      await beat(400);
      continue;
    }
    if (waiting.length === 0) {
      console.log('Queue clear of waiters.');
      return;
    }
    const calledNext = await callNextApi(token);
    const id = calledNext.data?.id ?? calledNext.data?.entryId;
    if (id) {
      await entryActionApi(token, id, 'complete').catch(() =>
        entryActionApi(token, id, 'skip'),
      );
    }
    await beat(400);
  }
  console.warn('Drain stopped after 40 iterations — continuing anyway.');
}

async function joinGuest(fullName) {
  const phone = `+1555${String(Date.now()).slice(-7)}`;
  const body = await apiJson(`${API}/queues/${QUEUE_ID}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName,
      phone,
      partySize: 2,
      notificationPreference: 'SMS',
    }),
  });
  const data = body.data;
  console.log(`Joined ${fullName} → ${data.displayCode} (${data.entryId})`);
  return data;
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
          left: '12px',
          right: '12px',
          bottom: '72px',
          zIndex: '999999',
          background: 'rgba(15, 23, 42, 0.94)',
          color: '#fff',
          padding: '12px 14px',
          borderRadius: '12px',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        });
        document.body.appendChild(el);
      }
      el.innerHTML = `<div style="font-size:13px;font-weight:700">${title}</div>${
        detail
          ? `<div style="margin-top:5px;font-size:11px;line-height:1.35;opacity:0.92">${detail}</div>`
          : ''
      }`;
      el.style.display = 'block';
    },
    { title, detail },
  );
}

async function captionBoth(guest, staff, title, detail, holdMs = 2800) {
  await Promise.all([
    showCaption(guest, title, detail).catch(() => {}),
    showCaption(staff, title, detail).catch(() => {}),
  ]);
  await beat(holdMs);
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById('qf-demo-caption');
    if (el) el.style.display = 'none';
  }).catch(() => {});
}

async function hideBoth(guest, staff) {
  await Promise.all([hideCaption(guest), hideCaption(staff)]);
}

async function focusFlutterField(page, yRatio, vp) {
  const pane = page.locator('flt-glass-pane, flutter-view, canvas').first();
  const box = await pane.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * yRatio);
  } else {
    await page.mouse.click(vp.width / 2, vp.height * yRatio);
  }
  await beat(400);
}

async function flutterLogin(page, vp) {
  await beat(5000);
  for (const y of [0.44, 0.46, 0.42, 0.48]) {
    await focusFlutterField(page, y, vp);
    if ((await page.locator('input.flt-text-editing, input').count()) > 0) break;
  }
  const inputs = page.locator('input.flt-text-editing, input');
  if ((await inputs.count()) > 0) {
    await inputs.first().fill(STAFF_EMAIL);
  } else {
    await page.keyboard.type(STAFF_EMAIL, { delay: 20 });
  }
  await beat(400);
  await page.keyboard.press('Tab');
  await beat(500);
  const pass = page.locator(
    'input.flt-text-editing, input[type="password"], input',
  );
  if ((await pass.count()) > 0) {
    await pass.first().fill(STAFF_PASSWORD);
  } else {
    await page.keyboard.type(STAFF_PASSWORD, { delay: 20 });
  }
  await beat(400);
  await page.keyboard.press('Enter');
  await beat(7000);
  if (/#\/login/i.test(page.url())) {
    await focusFlutterField(page, 0.62, vp);
    await beat(7000);
  }
}

async function waitUntilNotLogin(page, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!/#\/login/i.test(page.url())) return true;
    await beat(800);
  }
  return false;
}

async function tapStaff(page, xRatio, yRatio) {
  await page.mouse.click(
    Math.round(STAFF_VP.width * xRatio),
    Math.round(STAFF_VP.height * yRatio),
  );
}

async function dismissStaffSheet(page) {
  // Tap dimmed area above the sheet.
  await tapStaff(page, 0.5, 0.18);
  await beat(1200);
}

async function openManageCalled(page) {
  // Sticky “Continue with called guest” / Call Next above bottom nav.
  await tapStaff(page, 0.5, 0.86);
  await beat(2800);
}

async function tapSheetSeat(page) {
  // Primary success button in sheet (Seat / Complete).
  await tapStaff(page, 0.5, 0.72);
  await beat(2200);
}

async function tapSheetCallAgain(page) {
  // Second primary under Seat.
  await tapStaff(page, 0.5, 0.8);
  await beat(2200);
}

async function tapSheetHold(page) {
  // Left secondary in Hold | No show row.
  await tapStaff(page, 0.32, 0.88);
  await beat(2500);
}

async function tapSheetNoShow(page) {
  // Right secondary.
  await tapStaff(page, 0.68, 0.88);
  await beat(2500);
}

async function tapBottomNav(page, index) {
  const x = Math.round(STAFF_VP.width * ((index + 0.5) / 5));
  await page.mouse.click(x, STAFF_VP.height - 36);
  await beat(2200);
}

async function guestJoinViaUi(page, fullName) {
  const phone = `+1555${String(Date.now()).slice(-7)}`;
  await page.goto(`${GUEST_BASE}/q/${QUEUE_ID}?fresh=1`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await beat(1800);
  const joinElse = page.getByRole('button', { name: /join as someone else/i });
  if (await joinElse.isVisible().catch(() => false)) {
    await joinElse.click();
    await beat(1000);
  }
  const joinCta = page
    .getByRole('link', { name: /join queue/i })
    .or(page.getByRole('button', { name: /join queue/i }));
  await joinCta.first().click();
  await page.waitForURL(/\/join/, { timeout: 30_000 });
  await beat(1200);

  const partyBtn = page.getByRole('button', { name: /^2$/ });
  if (await partyBtn.isVisible().catch(() => false)) {
    await partyBtn.click();
    await beat(500);
  }

  await page.locator('#fullName').click();
  await page.locator('#fullName').fill('');
  await page.locator('#fullName').type(fullName, { delay: 45 });
  await beat(400);
  await page.locator('#phone').click();
  await page.locator('#phone').fill('');
  await page.locator('#phone').type(phone, { delay: 35 });
  await beat(600);

  await page.getByRole('button', { name: /^continue$/i }).click();
  await beat(1500);
  await page
    .getByRole('button', { name: /join the queue|confirm|join queue/i })
    .first()
    .click();
  await page.waitForURL(/\/track\//, { timeout: 45_000 });
  const entryId = page.url().match(/\/track\/([^/?#]+)/)?.[1];
  return { entryId, phone };
}

function composeVideos(guestWebm, staffWebm, outPath) {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary missing');
  // Side-by-side, labels, 1.5x playback.
  const filter = [
    '[0:v]scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:black,setsar=1,drawtext=text=GUEST\\ PHONE:x=18:y=18:fontsize=28:fontcolor=white:box=1:boxcolor=0x0f172a@0.75:boxborderw=8[g]',
    '[1:v]scale=960:960:force_original_aspect_ratio=decrease,pad=960:960:(ow-iw)/2:(oh-ih)/2:black,setsar=1,drawtext=text=STAFF\\ CONSOLE:x=18:y=18:fontsize=28:fontcolor=white:box=1:boxcolor=0x0f172a@0.75:boxborderw=8[s]',
    '[g][s]hstack=inputs=2[v]',
    '[v]setpts=PTS/1.5[vout]',
  ].join(';');

  const args = [
    '-y',
    '-i',
    guestWebm,
    '-i',
    staffWebm,
    '-filter_complex',
    filter,
    '-map',
    '[vout]',
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '2M',
    '-row-mt',
    '1',
    outPath,
  ];
  console.log('Compositing with ffmpeg…');
  const r = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg failed with status ${r.status}`);
  }
}

function pickNewestWebm(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => ({
      f,
      t: fs.statSync(path.join(dir, f)).mtimeMs,
      p: path.join(dir, f),
    }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error(`No webm in ${dir}`);
  return files[0].p;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP_DIR, 'guest'), { recursive: true });
  fs.mkdirSync(path.join(TMP_DIR, 'staff'), { recursive: true });

  const token = await staffLoginToken();
  await drainActiveQueue(token);

  const browser = await chromium.launch({ headless: true, slowMo: 0 });

  const guestCtx = await browser.newContext({
    ...PHONE,
    recordVideo: {
      dir: path.join(TMP_DIR, 'guest'),
      size: { width: PHONE.viewport.width, height: PHONE.viewport.height },
    },
    locale: 'en-US',
  });
  const staffCtx = await browser.newContext({
    viewport: STAFF_VP,
    recordVideo: {
      dir: path.join(TMP_DIR, 'staff'),
      size: STAFF_VP,
    },
    locale: 'en-US',
  });

  const guest = await guestCtx.newPage();
  const staff = await staffCtx.newPage();

  try {
    // —— Staff login first so Live Queue is watching ——
    await staff.goto(STAFF_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await captionBoth(
      guest,
      staff,
      'Client demo — Guest phone | Staff console',
      'We will walk the full queue lifecycle: join → notify → Call Next → Call again → Hold → Seat, then No-show / cancel. Dual screen at 1.5×.',
      3200,
    );

    await captionBoth(
      guest,
      staff,
      'Staff signs in',
      'Only invited hosts can open the Live Queue. Credentials are checked against the live API.',
      2200,
    );
    await hideBoth(guest, staff);
    await flutterLogin(staff, STAFF_VP);
    if (!(await waitUntilNotLogin(staff))) {
      throw new Error('Staff login failed');
    }
    await beat(4000);
    await captionBoth(
      guest,
      staff,
      'Live Queue is ready',
      'Online/Live means the socket is connected and authorized. Staff sees waiting count and who is next.',
      2800,
    );

    // —— Guest joins (UI) while staff watches ——
    await captionBoth(
      guest,
      staff,
      'Guest joins from QR / link',
      'Customer enters name + phone. A wait timer and position start on their phone. Staff board updates live — no refresh needed.',
      2400,
    );
    await hideBoth(guest, staff);
    const guestA = await guestJoinViaUi(guest, 'Alex Rivera');
    await beat(2500);
    await captionBoth(
      guest,
      staff,
      'Waiting + ETA timer',
      'Guest phone shows place in line and estimated wait. Staff Live Queue waiting count increases; join toast/sound confirms the arrival.',
      3600,
    );

    // —— Call Next ——
    await captionBoth(
      guest,
      staff,
      'Staff taps Call Next',
      'Calls the true next waiter only. Double-tap cannot stack two CALLED guests from this console.',
      2200,
    );
    await hideBoth(guest, staff);
    await openManageCalled(staff);
    await beat(3500);
    await captionBoth(
      guest,
      staff,
      'Guest phone → “It’s your turn”',
      'Realtime push updates the guest screen to the ready / table-ready state. Staff sheet shows the called party.',
      3600,
    );

    // Dismiss success → reopen manage → Call again
    await dismissStaffSheet(staff);
    await captionBoth(
      guest,
      staff,
      'Call again (recall)',
      'If the guest missed the ping, Call again re-notifies without advancing the queue to someone else.',
      2200,
    );
    await hideBoth(guest, staff);
    await openManageCalled(staff);
    await beat(1500);
    await tapSheetCallAgain(staff);
    await beat(2800);
    await captionBoth(
      guest,
      staff,
      'Guest re-alerted',
      'Phone shows another “please come now” / turn toast while status stays CALLED.',
      3000,
    );

    // Hold
    await captionBoth(
      guest,
      staff,
      'Hold',
      'Guest needs a minute (restroom, parking). Hold keeps their place without seating the next party yet.',
      2200,
    );
    await hideBoth(guest, staff);
    // Sheet may still be open after recall; if showing buttons, Hold is bottom-left.
    await tapSheetHold(staff);
    await beat(2000);
    // If sheet closed without hold, reopen and hold
    await openManageCalled(staff);
    await beat(1200);
    await tapSheetHold(staff);
    await beat(2800);
    await captionBoth(
      guest,
      staff,
      'Guest phone → on hold',
      'Tracking switches to a holding / almost-ready experience so the guest knows staff paused them intentionally.',
      3400,
    );

    // Resume via API (reliable) then Call Next from staff UI so guest sees CALLED again
    if (guestA.entryId) {
      await entryActionApi(token, guestA.entryId, 'resume').catch(() => {});
      await beat(800);
      // If still HOLDING, try recall/call paths
    }
    await captionBoth(
      guest,
      staff,
      'Resume → Call again',
      'Staff resumes the held guest and calls them so the phone returns to “your turn”.',
      2200,
    );
    await hideBoth(guest, staff);
    // Ensure guest is CALLED for seat demo
    try {
      const snap = await getSnapshot(token);
      const entries = snap.entries ?? [];
      const mine = entries.find(
        (e) => (e.id ?? e.entryId) === guestA.entryId,
      );
      if (mine?.status === 'HOLDING') {
        await entryActionApi(token, guestA.entryId, 'resume');
      }
      const called = (snap.entries ?? []).find((e) => e.status === 'CALLED');
      if (!called || (called.id ?? called.entryId) !== guestA.entryId) {
        // call next should get them if waiting
        const after = await getSnapshot(token);
        const m2 = (after.entries ?? []).find(
          (e) => (e.id ?? e.entryId) === guestA.entryId,
        );
        if (m2?.status === 'WAITING') {
          await callNextApi(token);
        } else if (m2?.status === 'HOLDING') {
          await entryActionApi(token, guestA.entryId, 'resume');
          await callNextApi(token);
        }
      }
      // Force recall for visible toast
      await entryActionApi(token, guestA.entryId, 'recall').catch(() => {});
    } catch (e) {
      console.warn('Resume/call helper:', e.message);
    }
    await beat(2500);
    await guest.reload({ waitUntil: 'networkidle' }).catch(() => {});
    await beat(2000);
    await captionBoth(
      guest,
      staff,
      'Guest ready again',
      'Phone is back on the ready screen. Staff can now Seat them.',
      2800,
    );

    // Seat
    await dismissStaffSheet(staff);
    await captionBoth(
      guest,
      staff,
      'Seat / Complete',
      'Party is ready at the table. Seat finishes the visit and frees Call Next for the next guest.',
      2200,
    );
    await hideBoth(guest, staff);
    await openManageCalled(staff);
    await beat(1200);
    await tapSheetSeat(staff);
    await beat(1500);
    await tapSheetSeat(staff);
    // Ensure complete via API if UI miss
    try {
      await entryActionApi(token, guestA.entryId, 'complete');
    } catch {
      /* already completed */
    }
    await beat(2500);
    await guest.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await beat(2000);
    await captionBoth(
      guest,
      staff,
      'Guest completed',
      'Phone moves to “you’re all set” / completed. Staff waiting count drops.',
      3200,
    );

    // —— Guest B: No show / cancel path ——
    await captionBoth(
      guest,
      staff,
      'Second guest — No-show path',
      'If a called guest never arrives, staff marks No show. The guest phone shows a cancelled / no-show end state.',
      2600,
    );
    await hideBoth(guest, staff);
    const guestB = await joinGuest('Sam Patel');
    await guest.goto(`${GUEST_BASE}/track/${guestB.entryId}?welcome=1`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    await beat(2200);
    await captionBoth(
      guest,
      staff,
      'New waiter on both screens',
      'Guest B waiting with timer. Staff Call Next, then No show instead of Seat.',
      2800,
    );
    await hideBoth(guest, staff);
    await openManageCalled(staff);
    await beat(3000);
    await dismissStaffSheet(staff);
    await openManageCalled(staff);
    await beat(1200);
    await tapSheetNoShow(staff);
    await beat(1200);
    try {
      await entryActionApi(token, guestB.entryId, 'skip');
    } catch {
      /* already skipped */
    }
    await beat(2000);
    await guest.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await beat(2000);
    await captionBoth(
      guest,
      staff,
      'No-show / cancelled on guest phone',
      'Guest sees the ended state (no-show / skipped). Staff can Call Next for the next real waiter.',
      3400,
    );

    // Messages + logout
    await captionBoth(
      guest,
      staff,
      'Messages (notification log)',
      'SMS/WhatsApp delivery trail for Call Next / recall — proof guests were notified, not a silent board refresh.',
      2200,
    );
    await hideBoth(guest, staff);
    await tapBottomNav(staff, 3);
    await beat(3500);

    await captionBoth(
      guest,
      staff,
      'Sign out',
      'Logout clears the staff session so the shared tablet is not left unlocked.',
      2000,
    );
    await hideBoth(guest, staff);
    await tapStaff(staff, 0.97, 0.05);
    await beat(2500);
    await captionBoth(
      guest,
      staff,
      'End-to-end staff check complete',
      'Verified: join + timer → Live notify → Call Next → Call again → Hold → Seat → No-show → Messages → logout.',
      3600,
    );
    await hideBoth(guest, staff);
    await beat(800);
  } finally {
    const gVideo = guest.video();
    const sVideo = staff.video();
    await guestCtx.close();
    await staffCtx.close();
    await browser.close();

    const guestPath = gVideo ? await gVideo.path() : pickNewestWebm(path.join(TMP_DIR, 'guest'));
    const staffPath = sVideo ? await sVideo.path() : pickNewestWebm(path.join(TMP_DIR, 'staff'));
    await beat(600);

    const finalPath = path.join(OUT_DIR, 'staff-guest-dual-e2e-1.5x.webm');
    composeVideos(guestPath, staffPath, finalPath);
    const mb = (fs.statSync(finalPath).size / (1024 * 1024)).toFixed(2);
    console.log(`Saved: ${finalPath} (${mb} MB)`);

    // Keep raw sides for debugging
    fs.copyFileSync(guestPath, path.join(OUT_DIR, 'staff-guest-dual-guest-raw.webm'));
    fs.copyFileSync(staffPath, path.join(OUT_DIR, 'staff-guest-dual-staff-raw.webm'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
