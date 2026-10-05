import { test, expect, uniquePhone } from './fixtures';

/**
 * QF-100 — guest join → wait → Browse Menu → back (mobile / Pixel viewport).
 * Does not require staff credentials (unlike call-next journey tests).
 * Viewport comes from playwright.config (Pixel 7).
 */
test.describe('Browse Menu journey', () => {
  test.beforeEach(async ({}, testInfo) => {
    const api =
      (testInfo.config.metadata.apiBaseUrl as string | undefined) ??
      process.env.API_BASE_URL ??
      'http://localhost:3000/api/v1';
    try {
      const res = await fetch(`${api.replace(/\/api\/v1\/?$/, '')}/api/v1/health/live`);
      if (!res.ok) test.skip(true, 'Backend health check failed');
    } catch {
      test.skip(true, 'Backend not reachable');
    }
  });

  test('dine-in: join → track → Browse Menu → back', async ({ page, queues }) => {
    const phone = uniquePhone();

    await page.goto(`/q/${queues.dineIn}?fresh=1`);
    const joinElse = page.getByRole('button', { name: /join as someone else/i });
    if (await joinElse.isVisible().catch(() => false)) {
      await joinElse.click();
    }

    await page
      .getByRole('link', { name: /join queue/i })
      .or(page.getByRole('button', { name: /join queue/i }))
      .first()
      .click();
    await page.waitForURL(/\/join/, { timeout: 30_000 });

    await page.locator('#fullName').fill('Menu Demo Guest');
    await page.locator('#phone').fill(phone);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByRole('button', { name: /join the queue|confirm|join queue/i }).first().click();

    await page.waitForURL(/\/track\//, { timeout: 45_000 });
    const entryId = page.url().match(/\/track\/([^/?#]+)/)?.[1];
    expect(entryId).toBeTruthy();

    const browse = page.getByRole('button', { name: /browse menu/i });
    await browse.waitFor({ state: 'visible', timeout: 20_000 });
    await browse.click();

    await page.waitForURL(/\/menu\//, { timeout: 30_000 });
    // Categories or menu items should render for Bella Vista.
    await expect(
      page
        .getByRole('heading')
        .or(page.getByText(/menu|starter|main|drink|dessert|pizza|salad/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    const back = page.getByRole('link', { name: /back to queue/i }).or(
      page.getByRole('button', { name: /back to queue/i }),
    );
    if (await back.first().isVisible().catch(() => false)) {
      await back.first().click();
    } else {
      await page.goBack();
    }
    await page.waitForURL(new RegExp(`/track/${entryId}`), { timeout: 20_000 });
  });

  test('join form blocks empty name', async ({ page, queues }) => {
    await page.goto(`/q/${queues.dineIn}/join?fresh=1`);
    await page.locator('#fullName').fill('');
    await page.locator('#phone').fill(uniquePhone());
    const continueBtn = page.getByRole('button', { name: /^continue$/i });
    await expect(continueBtn).toBeDisabled();
    await expect(page).not.toHaveURL(/\/track\//);
  });

  test('bad queue id shows friendly error', async ({ page }) => {
    await page.goto('/q/00000000-0000-4000-8000-000000000000?fresh=1');
    await expect(
      page.getByText(/couldn't|could not|not found|unavailable|closed|error|try again/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
