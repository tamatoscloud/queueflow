import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationJobStatus } from '@prisma/client';
import { NotificationJobRepository } from '../queue/notification-job.repository';
import { PostgresNotificationQueueService } from '../queue/postgres-notification-queue.service';
import { NonRetryableNotificationError } from '../services/notification-dispatcher.service';
import {
  notificationQueueConfig,
  resolveNotificationQueueDriver,
} from '../constants/notification-queue.constants';

describe('notification queue driver config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to redis', () => {
    vi.stubEnv('NOTIFICATION_QUEUE_DRIVER', '');
    expect(resolveNotificationQueueDriver()).toBe('redis');
  });

  it('selects postgres driver', () => {
    vi.stubEnv('NOTIFICATION_QUEUE_DRIVER', 'postgres');
    expect(resolveNotificationQueueDriver()).toBe('postgres');
  });

  it('enables postgres driver without REDIS_URL', () => {
    vi.stubEnv('NOTIFICATION_QUEUE_DRIVER', 'postgres');
    vi.stubEnv('REDIS_URL', '');
    vi.stubEnv('NOTIFICATION_QUEUE_ENABLED', 'true');
    const cfg = notificationQueueConfig();
    expect(cfg.driver).toBe('postgres');
    expect(cfg.enabled).toBe(true);
  });

  it('keeps redis disabled without REDIS_URL', () => {
    vi.stubEnv('NOTIFICATION_QUEUE_DRIVER', 'redis');
    vi.stubEnv('REDIS_URL', '');
    const cfg = notificationQueueConfig();
    expect(cfg.enabled).toBe(false);
  });
});

describe('NotificationJobRepository concurrency', () => {
  it('claims distinct jobs under concurrent SKIP LOCKED workers', async () => {
    const jobs = Array.from({ length: 100 }, (_, i) => ({
      id: `job-${i}`,
      notification_id: `n-${i}`,
      attempts: 0,
      max_attempts: 5,
    }));

    // Simulate SKIP LOCKED: each claimBatch removes claimed ids from pool.
    const pool = [...jobs];
    const claimedIds = new Set<string>();

    const fakePrisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          $queryRaw: async () => {
            const batch = pool.splice(0, 10);
            return batch;
          },
          notificationJob: {
            update: async ({ where }: { where: { id: string } }) => {
              if (claimedIds.has(where.id)) {
                throw new Error(`duplicate claim ${where.id}`);
              }
              claimedIds.add(where.id);
              return {};
            },
          },
        };
        return fn(tx);
      },
      notificationJob: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
        count: vi.fn(),
      },
    };

    const repo = new NotificationJobRepository(fakePrisma as never);

    const workers = Array.from({ length: 10 }, (_, w) =>
      repo.claimBatch(`worker-${w}`, 10),
    );
    const results = await Promise.all(workers);
    const flat = results.flat();

    expect(flat).toHaveLength(100);
    expect(new Set(flat.map((j) => j.id)).size).toBe(100);
    expect(claimedIds.size).toBe(100);
  });
});

describe('PostgresNotificationQueueService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  function createService(jobs: Partial<NotificationJobRepository>) {
    vi.stubEnv('NOTIFICATION_QUEUE_DRIVER', 'postgres');
    vi.stubEnv('NOTIFICATION_QUEUE_ENABLED', 'true');
    vi.stubEnv('NOTIFICATION_PG_POLL_INTERVAL_MS', '50');
    vi.stubEnv('NOTIFICATION_WORKER_CONCURRENCY', '5');
    return new PostgresNotificationQueueService(jobs as NotificationJobRepository);
  }

  it('enqueues via repository', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const service = createService({ enqueue });
    await service.enqueueSend('n-1', { delayMs: 100 });
    expect(enqueue).toHaveBeenCalledWith('n-1', expect.objectContaining({ delayMs: 100 }));
  });

  it('processes success and marks completed', async () => {
    vi.useFakeTimers();
    const claimBatch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'job-1',
          notificationId: 'n-1',
          attempts: 1,
          maxAttempts: 5,
          lockedBy: 'w',
        },
      ])
      .mockResolvedValue([]);
    const markCompleted = vi.fn().mockResolvedValue(undefined);
    const service = createService({
      claimBatch,
      markCompleted,
      scheduleRetry: vi.fn(),
      markFailedTerminal: vi.fn(),
    });

    const processed: string[] = [];
    service.startWorker(async (job) => {
      processed.push(job.data.notificationId);
    });

    await vi.advanceTimersByTimeAsync(60);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    expect(processed).toEqual(['n-1']);
    expect(markCompleted).toHaveBeenCalledWith('job-1');
    await service.onModuleDestroy();
  });

  it('schedules retry on retryable failure', async () => {
    vi.useFakeTimers();
    const claimBatch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'job-2',
          notificationId: 'n-2',
          attempts: 1,
          maxAttempts: 5,
          lockedBy: 'w',
        },
      ])
      .mockResolvedValue([]);
    const scheduleRetry = vi.fn().mockResolvedValue('retry');
    const service = createService({
      claimBatch,
      markCompleted: vi.fn(),
      scheduleRetry,
      markFailedTerminal: vi.fn(),
    });

    service.startWorker(async () => {
      throw new Error('NETWORK_ERROR');
    });

    await vi.advanceTimersByTimeAsync(60);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    expect(scheduleRetry).toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('marks terminal on NonRetryableNotificationError', async () => {
    vi.useFakeTimers();
    const claimBatch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'job-3',
          notificationId: 'n-3',
          attempts: 1,
          maxAttempts: 5,
          lockedBy: 'w',
        },
      ])
      .mockResolvedValue([]);
    const markFailedTerminal = vi.fn().mockResolvedValue(undefined);
    const service = createService({
      claimBatch,
      markCompleted: vi.fn(),
      scheduleRetry: vi.fn(),
      markFailedTerminal,
    });

    service.startWorker(async () => {
      throw new NonRetryableNotificationError('NO_PHONE');
    });

    await vi.advanceTimersByTimeAsync(60);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    expect(markFailedTerminal).toHaveBeenCalledWith('job-3', 'NO_PHONE');
    await service.onModuleDestroy();
  });

  it('duplicate enqueue without force is a no-op when pending', async () => {
    const enqueue = vi.fn().mockImplementation(async () => undefined);
    // exercise repository path with fake prisma
    const prisma = {
      notificationJob: {
        findUnique: vi.fn().mockResolvedValue({
          status: NotificationJobStatus.PENDING,
          attempts: 0,
        }),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await repo.enqueue('n-dup');
    expect(prisma.notificationJob.create).not.toHaveBeenCalled();
    expect(prisma.notificationJob.update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
