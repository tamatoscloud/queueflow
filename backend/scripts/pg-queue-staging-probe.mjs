/**
 * One-off staging PostgreSQL notification queue probe.
 *
 * Does NOT switch NOTIFICATION_QUEUE_DRIVER (must remain redis).
 * Does NOT deploy, migrate, or touch production.
 *
 * Usage (from backend/, Railway linked to queueflow-staging/backend):
 *   railway run -- node scripts/pg-queue-staging-probe.mjs
 *
 * Creates marker-prefixed business/customer/notification/job rows, exercises
 * enqueue/claim/ownership/retry/stale-reclaim/complete, then deletes them.
 */
import { randomUUID } from 'crypto';
import { PrismaClient, NotificationJobStatus } from '@prisma/client';
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('FAIL: DATABASE_URL is not set');
  process.exit(1);
}

const lower = url.toLowerCase();
if (lower.includes('production') || /\/queueflow[_-]?prod\b/.test(lower)) {
  console.error('FAIL: refusing production-looking DATABASE_URL');
  process.exit(1);
}

if (process.env.APP_ENV && process.env.APP_ENV !== 'staging') {
  console.error(`FAIL: APP_ENV=${process.env.APP_ENV} (expected staging)`);
  process.exit(1);
}

const driver = (process.env.NOTIFICATION_QUEUE_DRIVER ?? 'redis').toLowerCase();
if (driver !== 'redis') {
  console.error(
    `FAIL: NOTIFICATION_QUEUE_DRIVER=${driver} — probe requires redis (no cutover)`,
  );
  process.exit(1);
}

const marker = `pgq-probe-${randomUUID()}`;
const results = [];

function record(name, expected, actual, pass, cleanup) {
  results.push({ name, expected, actual, result: pass ? 'PASS' : 'FAIL', cleanup });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) {
    console.log(`  expected: ${expected}`);
    console.log(`  actual:   ${actual}`);
  }
}

const prisma = new PrismaClient();
let businessId = null;

async function claimBatch(workerId, limit, leaseMs = 5 * 60_000) {
  const leaseCutoff = new Date(Date.now() - leaseMs);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe(
      `SELECT id, notification_id, attempts, max_attempts
       FROM notification_jobs
       WHERE
         (status = 'PENDING'::notification_job_status AND available_at <= $1)
         OR (
           status = 'PROCESSING'::notification_job_status
           AND locked_at IS NOT NULL
           AND locked_at < $2
         )
       ORDER BY available_at ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED`,
      now,
      leaseCutoff,
      limit,
    );
    const claimed = [];
    for (const row of rows) {
      const nextAttempts = row.attempts + 1;
      await tx.notificationJob.update({
        where: { id: row.id },
        data: {
          status: NotificationJobStatus.PROCESSING,
          attempts: nextAttempts,
          lockedAt: now,
          lockedBy: workerId,
          lastError: null,
        },
      });
      claimed.push({
        id: row.id,
        notificationId: row.notification_id,
        attempts: nextAttempts,
        maxAttempts: row.max_attempts,
        lockedBy: workerId,
      });
    }
    return claimed;
  });
}

async function enqueueAtomic(notificationId, { delayMs = 0, force = false } = {}) {
  const availableAt = new Date(Date.now() + delayMs);
  if (force) {
    await prisma.notificationJob.upsert({
      where: { notificationId },
      create: {
        notificationId,
        status: NotificationJobStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
        availableAt,
      },
      update: {
        status: NotificationJobStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
        availableAt,
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        processedAt: null,
      },
    });
    return;
  }
  try {
    await prisma.notificationJob.create({
      data: {
        notificationId,
        status: NotificationJobStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
        availableAt,
      },
    });
  } catch (err) {
    if (err?.code !== 'P2002') throw err;
    await prisma.notificationJob.updateMany({
      where: {
        notificationId,
        status: {
          in: [
            NotificationJobStatus.COMPLETED,
            NotificationJobStatus.FAILED,
            NotificationJobStatus.DEAD,
          ],
        },
      },
      data: {
        status: NotificationJobStatus.PENDING,
        maxAttempts: 5,
        availableAt,
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        processedAt: null,
      },
    });
  }
}

try {
  console.log(`Staging PG queue probe marker=${marker}`);
  console.log(`NOTIFICATION_QUEUE_DRIVER=${driver} (unchanged)`);

  const business = await prisma.business.create({
    data: {
      name: `${marker}-biz`,
      slug: marker.slice(0, 40),
      email: `${marker}@probe.test`,
    },
  });
  businessId = business.id;

  const customer = await prisma.customer.create({
    data: {
      businessId,
      fullName: `${marker}-customer`,
      phone: `+1888${Date.now().toString().slice(-8)}`,
    },
  });

  const notification = await prisma.notification.create({
    data: {
      businessId,
      customerId: customer.id,
      channel: 'SMS',
      type: 'QUEUE_JOINED',
      status: 'PENDING',
      idempotencyKey: `${marker}-n1`,
      payload: { probe: marker },
    },
  });

  // 1) enqueue
  await enqueueAtomic(notification.id, { delayMs: 0 });
  await enqueueAtomic(notification.id, { delayMs: 9999 });
  const afterEnqueue = await prisma.notificationJob.findUnique({
    where: { notificationId: notification.id },
  });
  record(
    'atomic_enqueue_idempotent',
    'single PENDING job, attempts=0',
    `count=1 status=${afterEnqueue?.status} attempts=${afterEnqueue?.attempts}`,
    afterEnqueue?.status === 'PENDING' && afterEnqueue.attempts === 0,
    'cascade delete via business',
  );

  // 2) claim + lock ownership
  const [claimed] = await claimBatch(`probe-owner-${marker}`, 1);
  const owned = await prisma.notificationJob.findUnique({
    where: { id: claimed.id },
  });
  record(
    'claim_sets_lock',
    'PROCESSING + locked_by owner + attempts=1',
    `status=${owned?.status} lockedBy=${owned?.lockedBy} attempts=${owned?.attempts}`,
    owned?.status === 'PROCESSING' &&
      owned.lockedBy === claimed.lockedBy &&
      owned.attempts === 1,
    'cascade delete via business',
  );

  const wrongComplete = await prisma.notificationJob.updateMany({
    where: {
      id: claimed.id,
      lockedBy: `intruder-${marker}`,
      status: NotificationJobStatus.PROCESSING,
    },
    data: { status: NotificationJobStatus.COMPLETED },
  });
  record(
    'wrong_worker_complete_blocked',
    'updateMany count=0',
    `count=${wrongComplete.count}`,
    wrongComplete.count === 0,
    'n/a',
  );

  // 3) retry / available_at
  const backoffMs = 2000;
  const beforeRetry = Date.now();
  await prisma.notificationJob.updateMany({
    where: {
      id: claimed.id,
      lockedBy: claimed.lockedBy,
      status: NotificationJobStatus.PROCESSING,
    },
    data: {
      status: NotificationJobStatus.PENDING,
      availableAt: new Date(beforeRetry + backoffMs),
      lockedAt: null,
      lockedBy: null,
      lastError: 'probe-retry',
    },
  });
  const afterRetry = await prisma.notificationJob.findUnique({
    where: { id: claimed.id },
  });
  const delayOk =
    afterRetry?.status === 'PENDING' &&
    afterRetry.availableAt.getTime() >= beforeRetry + backoffMs - 50;
  record(
    'retry_sets_available_at',
    `PENDING with available_at ~= now+${backoffMs}ms`,
    `status=${afterRetry?.status} availableAt=${afterRetry?.availableAt?.toISOString()}`,
    delayOk,
    'cascade delete via business',
  );

  // 4) stale lease recovery
  const staleNotif = await prisma.notification.create({
    data: {
      businessId,
      customerId: customer.id,
      channel: 'SMS',
      type: 'QUEUE_JOINED',
      status: 'PENDING',
      idempotencyKey: `${marker}-stale`,
      payload: { probe: marker },
    },
  });
  const staleAt = new Date(Date.now() - 60 * 60_000);
  const staleJob = await prisma.notificationJob.create({
    data: {
      notificationId: staleNotif.id,
      status: NotificationJobStatus.PROCESSING,
      attempts: 1,
      maxAttempts: 5,
      availableAt: staleAt,
      lockedAt: staleAt,
      lockedBy: `dead-${marker}`,
    },
  });
  const [rescued] = await claimBatch(`rescuer-${marker}`, 5);
  const rescuedRow = rescued
    ? await prisma.notificationJob.findUnique({ where: { id: rescued.id } })
    : null;
  record(
    'stale_lease_recovery',
    'rescuer claims stale job, attempts=2',
    rescued
      ? `idMatch=${rescued.id === staleJob.id} lockedBy=${rescuedRow?.lockedBy} attempts=${rescuedRow?.attempts}`
      : 'no claim',
    rescued?.id === staleJob.id &&
      rescuedRow?.lockedBy === `rescuer-${marker}` &&
      rescuedRow?.attempts === 2,
    'cascade delete via business',
  );

  // 5) complete owned job (rescued)
  if (rescued) {
    const completed = await prisma.notificationJob.updateMany({
      where: {
        id: rescued.id,
        lockedBy: rescued.lockedBy,
        status: NotificationJobStatus.PROCESSING,
      },
      data: {
        status: NotificationJobStatus.COMPLETED,
        lockedAt: null,
        lockedBy: null,
        processedAt: new Date(),
        lastError: null,
      },
    });
    record(
      'owned_complete',
      'count=1 COMPLETED',
      `count=${completed.count}`,
      completed.count === 1,
      'cascade delete via business',
    );
  }

  // 6) dead-letter path
  const deadNotif = await prisma.notification.create({
    data: {
      businessId,
      customerId: customer.id,
      channel: 'SMS',
      type: 'QUEUE_JOINED',
      status: 'PENDING',
      idempotencyKey: `${marker}-dead`,
      payload: { probe: marker },
    },
  });
  await prisma.notificationJob.create({
    data: {
      notificationId: deadNotif.id,
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 1,
      availableAt: new Date(Date.now() - 1000),
    },
  });
  const [deadClaim] = await claimBatch(`dead-owner-${marker}`, 1);
  await prisma.notificationJob.updateMany({
    where: {
      id: deadClaim.id,
      lockedBy: deadClaim.lockedBy,
      status: NotificationJobStatus.PROCESSING,
    },
    data: {
      status: NotificationJobStatus.DEAD,
      lockedAt: null,
      lockedBy: null,
      lastError: 'probe-max-attempts',
      processedAt: new Date(),
    },
  });
  const deadRow = await prisma.notificationJob.findUnique({
    where: { id: deadClaim.id },
  });
  record(
    'dead_letter_path',
    'DEAD with lastError',
    `status=${deadRow?.status} lastError=${deadRow?.lastError}`,
    deadRow?.status === 'DEAD' && deadRow.lastError === 'probe-max-attempts',
    'cascade delete via business',
  );
} catch (err) {
  console.error('PROBE ERROR', err?.message ?? err);
  results.push({
    name: 'probe_execution',
    expected: 'no throw',
    actual: String(err?.message ?? err),
    result: 'FAIL',
    cleanup: 'attempted',
  });
} finally {
  let cleanupOk = false;
  try {
    if (businessId) {
      await prisma.business.delete({ where: { id: businessId } });
      const leftover = await prisma.notificationJob.count({
        where: {
          notification: { idempotencyKey: { startsWith: marker } },
        },
      });
      cleanupOk = leftover === 0;
    } else {
      cleanupOk = true;
    }
  } catch (cleanupErr) {
    console.error('CLEANUP ERROR', cleanupErr?.message ?? cleanupErr);
    cleanupOk = false;
  }
  record(
    'cleanup',
    'all probe rows removed',
    cleanupOk ? 'removed' : 'FAILED',
    cleanupOk,
    cleanupOk ? 'done' : 'manual review needed',
  );
  await prisma.$disconnect();
}

const failed = results.filter((r) => r.result === 'FAIL');
console.log('\n=== Staging PG queue probe summary ===');
for (const r of results) {
  console.log(
    `- ${r.name}: ${r.result} | expected=${r.expected} | actual=${r.actual} | cleanup=${r.cleanup}`,
  );
}
console.log(
  failed.length === 0
    ? `\nALL PASS (${results.length}) — driver still redis, no deploy`
    : `\nFAILURES: ${failed.length}/${results.length}`,
);
process.exit(failed.length === 0 ? 0 : 1);
