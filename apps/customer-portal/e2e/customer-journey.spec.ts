import {
  callNext,
  completeEntry,
  getTracking,
  test,
  expect,
  uniquePhone,
} from './fixtures';

function apiBase(testInfo: { config: { metadata: Record<string, unknown> } }): string {
  return testInfo.config.metadata.apiBaseUrl as string;
}

async function callUntilStatus(
  api: string,
  queueId: string,
  token: string,
  entryId: string,
  statuses: string[],
  maxAttempts = 40,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const tracking = await getTracking(api, entryId);
    if (statuses.includes(tracking.entry.status)) return;
    await callNext(api, queueId, token);
  }
  const final = await getTracking(api, entryId);
  throw new Error(
    `Entry ${entryId} did not reach [${statuses.join(', ')}] (last: ${final.entry.status})`,
  );
}

test.describe('Customer journey — service modes', () => {
  test.beforeEach(async ({}, testInfo) => {
    const api = apiBase(testInfo);
    try {
      const res = await fetch(`${api.replace(/\/api\/v1\/?$/, '')}/api/v1/health/live`);
      if (!res.ok) {
        test.skip(true, 'Backend health check failed — start backend before E2E.');
      }
    } catch {
      test.skip(true, 'Backend not reachable — start backend before E2E.');
    }
  });

  test('dine-in: join → track → called → completed', async ({ page, queues, staffToken }, testInfo) => {
    const api = apiBase(testInfo);
    const phone = uniquePhone();

    await page.goto(`/q/${queues.dineIn}/join`);
    await page.locator('#fullName').fill('Demo Guest');
    await page.locator('#phone').fill(phone);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByRole('button', { name: /join the queue/i }).click();

    await page.waitForURL(/\/track\//, { timeout: 30_000 });
    await page.getByLabel(/queue token/i).waitFor({ state: 'visible' });

    const entryId = page.url().split('/track/')[1]?.split(/[?#]/)[0];
    expect(entryId).toBeTruthy();

    await callUntilStatus(api, queues.dineIn, staffToken, entryId!, ['CALLED', 'READY', 'SERVING']);
    await page.getByText(/your table is ready/i).waitFor({ state: 'visible', timeout: 20_000 });

    await completeEntry(api, entryId!, staffToken);
    const tracking = await getTracking(api, entryId!);
    expect(['COMPLETED', 'SERVED']).toContain(tracking.entry.status);
  });

  test('takeaway: join with order → track → ready → completed', async ({ page, queues, staffToken }, testInfo) => {
    const api = apiBase(testInfo);
    const phone = uniquePhone();

    await page.goto(`/q/${queues.takeaway}/join`);
    await page.locator('#orderNumber').fill('4821');
    await page.locator('#fullName').fill('Takeaway Guest');
    await page.locator('#phone').fill(phone);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByRole('button', { name: /join the queue/i }).click();

    await page.waitForURL(/\/track\//, { timeout: 30_000 });
    await expect(page.getByText(/table ready/i)).toHaveCount(0);

    const entryId = page.url().split('/track/')[1]?.split(/[?#]/)[0];
    expect(entryId).toBeTruthy();

    await callUntilStatus(api, queues.takeaway, staffToken, entryId!, ['CALLED', 'READY', 'SERVING']);
    await page.getByText(/order is ready|ready for pickup/i).first().waitFor({
      state: 'visible',
      timeout: 20_000,
    });

    await completeEntry(api, entryId!, staffToken);
  });

  test('drive-in: join with vehicle → track → ready → completed', async ({ page, queues, staffToken }, testInfo) => {
    const api = apiBase(testInfo);
    const phone = uniquePhone();

    await page.goto(`/q/${queues.driveIn}/join`);
    await page.locator('#vehicleDescription').fill('Black Toyota');
    await page.locator('#fullName').fill('Drive Guest');
    await page.locator('#phone').fill(phone);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByRole('button', { name: /join the queue/i }).click();

    await page.waitForURL(/\/track\//, { timeout: 30_000 });
    await expect(page.getByText(/table ready/i)).toHaveCount(0);

    const entryId = page.url().split('/track/')[1]?.split(/[?#]/)[0];
    expect(entryId).toBeTruthy();

    await callUntilStatus(api, queues.driveIn, staffToken, entryId!, ['CALLED', 'READY', 'SERVING']);
    await page.getByText(/coming to your car|on the way/i).first().waitFor({
      state: 'visible',
      timeout: 20_000,
    });

    await completeEntry(api, entryId!, staffToken);
  });
});
