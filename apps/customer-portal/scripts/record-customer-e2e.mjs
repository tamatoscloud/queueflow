/**
 * Records a normal-speed mobile walkthrough of the guest customer flow.
 * Output: apps/customer-portal/recordings/customer-e2e-mobile.webm
 *
 * Usage:
 *   node scripts/record-customer-e2e.mjs
 */
import { chromium, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'recordings');
const BASE =
  process.env.BASE_URL ?? 'https://queueflow-six-beta.vercel.app';
const QUEUE_ID =
  process.env.DINE_IN_QUEUE_ID ?? '5354156e-0e46-41a1-ab49-8c6dd9ac80f7';

/** Pause so a viewer can read the screen (ms). */
const beat = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollSlow(page, total = 900, steps = 6) {
  const each = Math.round(total / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, each);
    await beat(450);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    slowMo: 280,
  });

  const phone = devices['Pixel 7'];
  const context = await browser.newContext({
    ...phone,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: phone.viewport.width, height: phone.viewport.height },
    },
    locale: 'en-US',
  });

  const page = await context.newPage();
  const phoneNumber = `+1555${String(Date.now()).slice(-7)}`;

  try {
    // 1) Landing
    await page.goto(`${BASE}/q/${QUEUE_ID}?fresh=1`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible' });
    await beat(2800);
    await scrollSlow(page, 500, 4);
    await beat(1800);

    // Dismiss returning guest if shown
    const joinElse = page.getByRole('button', { name: /join as someone else/i });
    if (await joinElse.isVisible().catch(() => false)) {
      await joinElse.click();
      await beat(1500);
    }

    // 2) Start join
    const joinCta = page.getByRole('link', { name: /join queue/i }).or(
      page.getByRole('button', { name: /join queue/i }),
    );
    await joinCta.first().click();
    await page.waitForURL(/\/join/, { timeout: 30_000 });
    await beat(2200);

    // 3) Fill form at a readable pace
    const partyBtn = page.getByRole('button', { name: /^4$/ });
    if (await partyBtn.isVisible().catch(() => false)) {
      await partyBtn.click();
      await beat(900);
    }

    await page.locator('#fullName').click();
    await page.locator('#fullName').fill('');
    await page.locator('#fullName').type('Alex Rivera', { delay: 90 });
    await beat(700);

    await page.locator('#phone').click();
    await page.locator('#phone').fill('');
    await page.locator('#phone').type(phoneNumber, { delay: 70 });
    await beat(1000);

    // Optional scroll to see notification prefs
    await scrollSlow(page, 400, 3);
    await beat(1200);

    const continueBtn = page.getByRole('button', { name: /^continue$/i });
    await continueBtn.click();
    await beat(2200);

    // Confirm summary → join
    const confirmJoin = page.getByRole('button', {
      name: /join the queue|confirm|join queue/i,
    });
    await confirmJoin.first().click();

    await page.waitForURL(/\/track\//, { timeout: 45_000 });
    await beat(3200);

    // 4) Waiting screen — look around
    await scrollSlow(page, 700, 5);
    await beat(2500);

    // 5) Browse Menu
    const browseMenu = page.getByRole('button', { name: /browse menu/i }).or(
      page.getByRole('link', { name: /browse menu/i }),
    );
    await browseMenu.first().waitFor({ state: 'visible', timeout: 20_000 });
    await beat(1200);
    await browseMenu.first().click();
    await page.waitForURL(/\/menu\//, { timeout: 30_000 });
    await beat(2500);

    // Scroll menu categories
    await scrollSlow(page, 1400, 8);
    await beat(2000);
    await scrollSlow(page, 900, 5);
    await beat(2200);

    // 6) Back to waiting
    const back = page.getByRole('link', { name: /back to queue/i });
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForURL(/\/track\//, { timeout: 20_000 });
      await beat(2800);
    } else {
      await page.goBack();
      await beat(2800);
    }

    await scrollSlow(page, 400, 3);
    await beat(2500);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const rawPath = await video.path();
      const finalPath = path.join(OUT_DIR, 'customer-e2e-mobile.webm');
      // Wait a tick for file flush
      await beat(500);
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
