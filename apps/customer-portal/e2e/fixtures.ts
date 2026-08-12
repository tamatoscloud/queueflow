import { test as base, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type DemoQueues = {
  dineIn: string;
  takeaway: string;
  driveIn: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  requestId: string;
};

export type JoinResult = {
  entry: { id: string; status: string };
  token: { displayCode: string };
  trackingToken?: string;
};

export type TrackingResult = {
  entry: { id: string; status: string };
  trackingToken?: string;
};

type AuthTokens = {
  accessToken: string;
};

function apiBase(testInfo: { config: { metadata: Record<string, unknown> } }): string {
  return (
    (testInfo.config.metadata.apiBaseUrl as string | undefined) ??
    process.env.API_BASE_URL ??
    'http://localhost:3000/api/v1'
  );
}

function loadQueuesFromManifest(): Partial<DemoQueues> {
  const candidates = [
    path.resolve(__dirname, '../../../docs/demo/bella-vista-manifest.json'),
    path.resolve(__dirname, '../public/demo/bella-vista.json'),
  ];

  for (const manifestPath of candidates) {
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        mainQueue?: { id: string };
        serviceModes?: Record<string, { queueId: string }>;
        queues?: Array<{ id: string; name: string; serviceMode?: string }>;
      };

      if (manifest.serviceModes) {
        return {
          dineIn: manifest.serviceModes.DINE_IN?.queueId,
          takeaway: manifest.serviceModes.TAKEAWAY?.queueId,
          driveIn: manifest.serviceModes.DRIVE_IN?.queueId,
        };
      }

      const byMode = (mode: string) =>
        manifest.queues?.find((q) => q.serviceMode === mode)?.id;
      const byName = (pattern: RegExp) =>
        manifest.queues?.find((q) => pattern.test(q.name))?.id;

      return {
        dineIn: manifest.mainQueue?.id ?? byMode('DINE_IN') ?? byName(/dine-?in/i),
        takeaway: byMode('TAKEAWAY') ?? byName(/takeaway/i),
        driveIn: byMode('DRIVE_IN') ?? byName(/drive-?in/i),
      };
    } catch {
      // try next candidate
    }
  }

  return {};
}

export const test = base.extend<{
  queues: DemoQueues;
  staffToken: string;
}>({
  queues: async ({}, fixture, testInfo) => {
    const fromManifest = loadQueuesFromManifest();
    const dineIn =
      (testInfo.config.metadata.dineInQueueId as string | undefined) ??
      process.env.DINE_IN_QUEUE_ID ??
      fromManifest.dineIn;
    const takeaway =
      (testInfo.config.metadata.takeawayQueueId as string | undefined) ??
      process.env.TAKEAWAY_QUEUE_ID ??
      fromManifest.takeaway;
    const driveIn =
      (testInfo.config.metadata.driveInQueueId as string | undefined) ??
      process.env.DRIVE_IN_QUEUE_ID ??
      fromManifest.driveIn;

    if (!dineIn || !takeaway || !driveIn) {
      test.skip(
        true,
        'Queue IDs missing. Run `npm run demo:reset` in backend/ or set DINE_IN_QUEUE_ID, TAKEAWAY_QUEUE_ID, DRIVE_IN_QUEUE_ID.',
      );
    }

    await fixture({ dineIn: dineIn!, takeaway: takeaway!, driveIn: driveIn! });
  },

  staffToken: async ({}, fixture, testInfo) => {
    const email = process.env.DEMO_STAFF_EMAIL ?? 'owner@bellavista.example.com';
    const password = process.env.DEMO_STAFF_PASSWORD ?? process.env.SEED_DEMO_PASSWORD;
    if (!password) {
      test.skip(true, 'DEMO_STAFF_PASSWORD or SEED_DEMO_PASSWORD required for staff API steps.');
    }

    const res = await fetch(`${apiBase(testInfo)}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      test.skip(true, `Staff login failed (${res.status}). Check demo credentials.`);
    }
    const body = (await res.json()) as ApiEnvelope<AuthTokens>;
    await fixture(body.data.accessToken);
  },
});

export { expect };

export async function joinQueue(
  api: string,
  queueId: string,
  payload: Record<string, unknown>,
): Promise<JoinResult> {
  const res = await fetch(`${api}/queues/${queueId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  expect(res.ok, `join failed: ${res.status} ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as ApiEnvelope<JoinResult>;
  return body.data;
}

export async function getTracking(api: string, entryId: string): Promise<TrackingResult> {
  const res = await fetch(`${api}/customer-portal/entries/${entryId}/tracking`);
  expect(res.ok).toBeTruthy();
  const body = (await res.json()) as ApiEnvelope<TrackingResult>;
  return body.data;
}

export async function callNext(api: string, queueId: string, token: string): Promise<JoinResult> {
  const res = await fetch(`${api}/queues/${queueId}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok, `call-next failed: ${res.status}`).toBeTruthy();
  const body = (await res.json()) as ApiEnvelope<JoinResult>;
  return body.data;
}

export async function completeEntry(api: string, entryId: string, token: string): Promise<void> {
  const res = await fetch(`${api}/queue-entries/${entryId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok, `complete failed: ${res.status}`).toBeTruthy();
}

export function uniquePhone(): string {
  const suffix = String(Date.now()).slice(-8);
  return `+92300${suffix}`;
}
