import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationJobStatus, Prisma } from '@prisma/client';
import {
  NotificationJobLeaseError,
  NotificationJobRepository,
} from '../queue/notification-job.repository';
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

describe('NotificationJobRepository.enqueue (atomic)', () => {
  it('creates when absent', async () => {
    const prisma = {
      notificationJob: {
        create: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn(),
        upsert: vi.fn(),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await repo.enqueue('n-1', { delayMs: 1000 });
    expect(prisma.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notificationId: 'n-1',
          status: NotificationJobStatus.PENDING,
          attempts: 0,
        }),
      }),
    );
    expect(prisma.notificationJob.updateMany).not.toHaveBeenCalled();
  });

  it('treats concurrent unique conflict on PENDING as no-op', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['notification_id'] },
    });
    const prisma = {
      notificationJob: {
        create: vi.fn().mockRejectedValue(conflict),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn(),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await expect(repo.enqueue('n-dup')).resolves.toBeUndefined();
    expect(prisma.notificationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          notificationId: 'n-dup',
          status: {
            in: [
              NotificationJobStatus.COMPLETED,
              NotificationJobStatus.FAILED,
              NotificationJobStatus.DEAD,
            ],
          },
        }),
      }),
    );
  });

  it('requeues terminal jobs after unique conflict without force', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['notification_id'] },
    });
    const prisma = {
      notificationJob: {
        create: vi.fn().mockRejectedValue(conflict),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn(),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await repo.enqueue('n-done', { delayMs: 250 });
    expect(prisma.notificationJob.updateMany).toHaveBeenCalled();
  });

  it('force uses upsert and resets attempts', async () => {
    const prisma = {
      notificationJob: {
        create: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await repo.enqueue('n-force', { force: true });
    expect(prisma.notificationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          attempts: 0,
          status: NotificationJobStatus.PENDING,
        }),
      }),
    );
    expect(prisma.notificationJob.create).not.toHaveBeenCalled();
  });

  it('concurrent duplicate enqueue calls never throw unique errors', async () => {
    let created = false;
    const prisma = {
      notificationJob: {
        create: vi.fn().mockImplementation(async () => {
          if (created) {
            throw new Prisma.PrismaClientKnownRequestError('Unique', {
              code: 'P2002',
              clientVersion: 'test',
              meta: { target: ['notification_id'] },
            });
          }
          created = true;
          return {};
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn(),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await expect(
      Promise.all([
        repo.enqueue('n-race'),
        repo.enqueue('n-race'),
        repo.enqueue('n-race'),
      ]),
    ).resolves.toEqual([undefined, undefined, undefined]);
    expect(prisma.notificationJob.create).toHaveBeenCalledTimes(3);
  });
});

describe('NotificationJobRepository lock ownership', () => {
  it('markCompleted requires owning worker', async () => {
    const prisma = {
      notificationJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await repo.markCompleted('job-1', 'worker-a');
    expect(prisma.notificationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'job-1',
          lockedBy: 'worker-a',
          status: NotificationJobStatus.PROCESSING,
        },
      }),
    );
  });

  it('wrong-worker markCompleted throws lease error', async () => {
    const prisma = {
      notificationJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await expect(repo.markCompleted('job-1', 'worker-b')).rejects.toBeInstanceOf(
      NotificationJobLeaseError,
    );
  });

  it('wrong-worker scheduleRetry throws lease error', async () => {
    const prisma = {
      notificationJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await expect(
      repo.scheduleRetry('job-1', 'worker-b', 1, 5, 'boom', 1000),
    ).rejects.toBeInstanceOf(NotificationJobLeaseError);
  });

  it('wrong-worker markFailedTerminal throws lease error', async () => {
    const prisma = {
      notificationJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repo = new NotificationJobRepository(prisma as never);
    await expect(
      repo.markFailedTerminal('job-1', 'worker-b', 'NO_PHONE'),
    ).rejects.toBeInstanceOf(NotificationJobLeaseError);
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
    expect(enqueue).toHaveBeenCalledWith(
      'n-1',
      expect.objectContaining({ delayMs: 100 }),
    );
  });

  it('processes success and marks completed with worker ownership', async () => {
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
    expect(markCompleted).toHaveBeenCalledWith('job-1', expect.any(String));
    await service.onModuleDestroy();
  });

  it('schedules retry on retryable failure with worker id', async () => {
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

    expect(scheduleRetry).toHaveBeenCalledWith(
      'job-2',
      expect.any(String),
      1,
      5,
      'NETWORK_ERROR',
      expect.any(Number),
    );
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
    const markCompleted = vi.fn();
    const service = createService({
      claimBatch,
      markCompleted,
      scheduleRetry: vi.fn(),
      markFailedTerminal,
    });

    service.startWorker(async () => {
      throw new NonRetryableNotificationError('NO_PHONE');
    });

    await vi.advanceTimersByTimeAsync(60);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    expect(markFailedTerminal).toHaveBeenCalledWith(
      'job-3',
      expect.any(String),
      'NO_PHONE',
    );
    expect(markCompleted).not.toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('does not complete when lease ownership is lost', async () => {
    vi.useFakeTimers();
    const claimBatch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'job-4',
          notificationId: 'n-4',
          attempts: 1,
          maxAttempts: 5,
          lockedBy: 'w',
        },
      ])
      .mockResolvedValue([]);
    const markCompleted = vi
      .fn()
      .mockRejectedValue(new NotificationJobLeaseError('stolen'));
    const scheduleRetry = vi.fn();
    const service = createService({
      claimBatch,
      markCompleted,
      scheduleRetry,
      markFailedTerminal: vi.fn(),
    });

    service.startWorker(async () => undefined);

    await vi.advanceTimersByTimeAsync(60);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);

    expect(markCompleted).toHaveBeenCalled();
    expect(scheduleRetry).not.toHaveBeenCalled();
    await service.onModuleDestroy();
  });
});
