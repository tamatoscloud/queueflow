import { defineConfig, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadManifestQueueIds(): Partial<Record<string, string>> {
  const manifestPath = path.resolve(
    __dirname,
    '../../docs/demo/bella-vista-manifest.json',
  );
  if (!fs.existsSync(manifestPath)) return {};
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      serviceModes?: Record<string, { queueId: string }>;
    };
    return {
      DINE_IN_QUEUE_ID: manifest.serviceModes?.DINE_IN?.queueId,
      TAKEAWAY_QUEUE_ID: manifest.serviceModes?.TAKEAWAY?.queueId,
      DRIVE_IN_QUEUE_ID: manifest.serviceModes?.DRIVE_IN?.queueId,
    };
  } catch {
    return {};
  }
}

const manifestIds = loadManifestQueueIds();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  metadata: {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1',
    dineInQueueId: process.env.DINE_IN_QUEUE_ID ?? manifestIds.DINE_IN_QUEUE_ID,
    takeawayQueueId: process.env.TAKEAWAY_QUEUE_ID ?? manifestIds.TAKEAWAY_QUEUE_ID,
    driveInQueueId: process.env.DRIVE_IN_QUEUE_ID ?? manifestIds.DRIVE_IN_QUEUE_ID,
  },
});
