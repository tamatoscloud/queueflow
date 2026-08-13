/**
 * Real PostgreSQL SKIP LOCKED concurrency tests.
 *
 * Requires:
 *   NOTIFICATION_QUEUE_TEST_DATABASE_URL=<postgres url>
 *
 * Optional (staging-only probe runs):
 *   ALLOW_STAGING_PG_QUEUE_PROBE=1
 *
 * Skips when the URL is missing. Refuses production-looking URLs.
 * Creates only marker-prefixed rows and deletes them in afterAll.
 */
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationJobStatus, PrismaClient } from '@prisma/client';
import { NotificationJobRepository } from '../queue/notification-job.repository';
import { PrismaService } from '../../../common/prisma/prisma.service';

const TEST_URL =
  process.env.NOTIFICATION_QUEUE_TEST_DATABASE_URL?.trim() ||
  (process.env.RUN_PG_QUEUE_INTEGRATION === '1'
    ? process.env.DATABASE_URL?.trim()
    : undefined);

function assertSafeTestDatabase(url: string): void {
  const lower = url.toLowerCase();
  if (
    lower.includes('production') ||
    lower.includes('prod-') ||
    /\/queueflow[_-]?prod\b/.test(lower)
  ) {
    throw new Error(
      'Refusing to run notification job integration tests against a production-looking database',
    );
  }

  const isLocal =
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('@postgres:');
  const isStagingHint =
    lower.includes('uxdpixtacsozltavuhnp') ||
    lower.includes('staging') ||
    process.env.APP_ENV === 'staging';

  if (!isLocal && !isStagingHint) {
    throw new Error(
      'NOTIFICATION_QUEUE_TEST_DATABASE_URL must be local or an explicitly allowed staging URL',
    );
  }

  if (isStagingHint && !isLocal && process.env.ALLOW_STAGING_PG_QUEUE_PROBE !== '1') {
    throw new Error(
      'Staging URL detected — set ALLOW_STAGING_PG_QUEUE_PROBE=1 to permit ephemeral probe data',
    );
  }
}

const maybeDescribe = TEST_URL ? describe : describe.skip;

maybeDescribe('NotificationJobRepository real Postgres SKIP LOCKED', () => {
  const marker = `pgq-it-${randomUUID()}`;
  let prisma: PrismaClient;
  let repo: NotificationJobRepository;
  let businessId: string;
  let customerId: string;
  const notificationIds: string[] = [];
  const jobIds: string[] = [];

  beforeAll(async () => {
    if (!TEST_URL) return;
    assertSafeTestDatabase(TEST_URL);

    prisma = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
    await prisma.$connect();
    repo = new NotificationJobRepository(prisma as unknown as PrismaService);

    const business = await prisma.business.create({
      data: {
        name: `${marker}-biz`,
        slug: marker.slice(0, 40),
        email: `${marker}@example.test`,
      },
    });
    businessId = business.id;

    const customer = await prisma.customer.create({
      data: {
        businessId,
        fullName: `${marker}-customer`,
        phone: `+1999${Date.now().toString().slice(-8)}`,
      },
    });
    customerId = customer.id;

    for (let i = 0; i < 20; i++) {
      const n = await prisma.notification.create({
        data: {
          businessId,
          customerId,
          channel: 'SMS',
          type: 'QUEUE_JOINED',
          status: 'PENDING',
          idempotencyKey: `${marker}-n-${i}`,
          payload: { probe: marker, i },
        },
      });
      notificationIds.push(n.id);

      const job = await prisma.notificationJob.create({
        data: {
          notificationId: n.id,
          status: NotificationJobStatus.PENDING,
          attempts: 0,
          maxAttempts: 5,
          availableAt: new Date(Date.now() - 1000),
        },
      });
      jobIds.push(job.id);
    }
  }, 60_000);

  afterAll(async () => {
    if (!prisma) return;
    try {
      if (businessId) {
        await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
      }
    } finally {
      await prisma.$disconnect();
    }
  }, 60_000);

  it('claims distinct jobs under concurrent workers with SKIP LOCKED', async () => {
    const workers = Array.from({ length: 8 }, (_, i) =>
      repo.claimBatch(`it-worker-${marker}-${i}`, 3),
    );
    const batches = await Promise.all(workers);
    const flat = batches.flat();

    expect(flat.length).toBeGreaterThan(0);
    expect(new Set(flat.map((j) => j.id)).size).toBe(flat.length);
    expect(new Set(flat.map((j) => j.notificationId)).size).toBe(flat.length);

    for (const claimed of flat) {
      const row = await prisma.notificationJob.findUniqueOrThrow({
        where: { id: claimed.id },
      });
      expect(row.status).toBe(NotificationJobStatus.PROCESSING);
      expect(row.lockedBy).toBe(claimed.lockedBy);
      expect(row.lockedAt).toBeTruthy();
      expect(row.attempts).toBe(1);
    }

    // Exhaust remaining with another concurrent wave
    const wave2 = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        repo.claimBatch(`it-worker2-${marker}-${i}`, 5),
      ),
    );
    const all = [...flat, ...wave2.flat()];
    expect(new Set(all.map((j) => j.id)).size).toBe(all.length);
    expect(all.length).toBe(jobIds.length);
  }, 60_000);

  it('rejects complete/retry from the wrong worker', async () => {
    const n = await prisma.notification.create({
      data: {
        businessId,
        customerId,
        channel: 'SMS',
        type: 'QUEUE_JOINED',
        status: 'PENDING',
        idempotencyKey: `${marker}-ownership`,
        payload: { probe: marker },
      },
    });
    notificationIds.push(n.id);

    await prisma.notificationJob.create({
      data: {
        notificationId: n.id,
        status: NotificationJobStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
        availableAt: new Date(Date.now() - 1000),
      },
    });

    const [owned] = await repo.claimBatch(`owner-${marker}`, 1);
    expect(owned).toBeDefined();
    if (!owned) throw new Error('expected owned claim');

    await expect(
      repo.markCompleted(owned.id, `intruder-${marker}`),
    ).rejects.toThrow(/not owned/);

    await expect(
      repo.scheduleRetry(owned.id, `intruder-${marker}`, 1, 5, 'x', 100),
    ).rejects.toThrow(/not owned/);

    await repo.markCompleted(owned.id, owned.lockedBy);
    const row = await prisma.notificationJob.findUniqueOrThrow({
      where: { id: owned.id },
    });
    expect(row.status).toBe(NotificationJobStatus.COMPLETED);
    expect(row.lockedBy).toBeNull();
  }, 30_000);

  it('reclaims stale PROCESSING leases', async () => {
    const n = await prisma.notification.create({
      data: {
        businessId,
        customerId,
        channel: 'SMS',
        type: 'QUEUE_JOINED',
        status: 'PENDING',
        idempotencyKey: `${marker}-stale`,
        payload: { probe: marker },
      },
    });

    const staleAt = new Date(Date.now() - 60 * 60_000);
    const job = await prisma.notificationJob.create({
      data: {
        notificationId: n.id,
        status: NotificationJobStatus.PROCESSING,
        attempts: 1,
        maxAttempts: 5,
        availableAt: staleAt,
        lockedAt: staleAt,
        lockedBy: `dead-worker-${marker}`,
      },
    });

    const [reclaimed] = await repo.claimBatch(`rescuer-${marker}`, 1);
    expect(reclaimed?.id).toBe(job.id);
    expect(reclaimed?.lockedBy).toBe(`rescuer-${marker}`);
    expect(reclaimed?.attempts).toBe(2);

    const row = await prisma.notificationJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(row.status).toBe(NotificationJobStatus.PROCESSING);
    expect(row.lockedBy).toBe(`rescuer-${marker}`);
  }, 30_000);

  it('atomic enqueue tolerates concurrent duplicates', async () => {
    const n = await prisma.notification.create({
      data: {
        businessId,
        customerId,
        channel: 'SMS',
        type: 'QUEUE_JOINED',
        status: 'PENDING',
        idempotencyKey: `${marker}-enq`,
        payload: { probe: marker },
      },
    });

    await expect(
      Promise.all([
        repo.enqueue(n.id, { delayMs: 0 }),
        repo.enqueue(n.id, { delayMs: 0 }),
        repo.enqueue(n.id, { delayMs: 5000 }),
      ]),
    ).resolves.toEqual([undefined, undefined, undefined]);

    const jobs = await prisma.notificationJob.findMany({
      where: { notificationId: n.id },
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.status).toBe(NotificationJobStatus.PENDING);
    expect(jobs[0]!.attempts).toBe(0);
  }, 30_000);
});
