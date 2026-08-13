import { Injectable, Logger } from '@nestjs/common';
import { NotificationJobStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { notificationQueueConfig } from '../constants/notification-queue.constants';

export interface ClaimedNotificationJob {
  id: string;
  notificationId: string;
  attempts: number;
  maxAttempts: number;
  lockedBy: string;
}

export class NotificationJobLeaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationJobLeaseError';
  }
}

function isUniqueNotificationIdConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    (Array.isArray(err.meta?.target)
      ? (err.meta.target as string[]).some(
          (t) => t === 'notification_id' || t === 'notificationId',
        )
      : true)
  );
}

const REQUEUEABLE_JOB_STATUSES: NotificationJobStatus[] = [
  NotificationJobStatus.COMPLETED,
  NotificationJobStatus.FAILED,
  NotificationJobStatus.DEAD,
];

@Injectable()
export class NotificationJobRepository {
  private readonly logger = new Logger(NotificationJobRepository.name);
  private readonly config = notificationQueueConfig();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically upsert a pending job for a notification (unique notification_id).
   * Concurrent enqueues must not throw unique-constraint errors.
   * Existing PENDING/PROCESSING rows are left untouched unless `force` is set.
   */
  async enqueue(
    notificationId: string,
    options?: { delayMs?: number; force?: boolean; maxAttempts?: number },
  ): Promise<void> {
    const delayMs = Math.max(0, options?.delayMs ?? 0);
    const availableAt = new Date(Date.now() + delayMs);
    const maxAttempts = options?.maxAttempts ?? this.config.maxAttempts;

    if (options?.force) {
      await this.prisma.notificationJob.upsert({
        where: { notificationId },
        create: {
          notificationId,
          status: NotificationJobStatus.PENDING,
          attempts: 0,
          maxAttempts,
          availableAt,
        },
        update: {
          status: NotificationJobStatus.PENDING,
          attempts: 0,
          maxAttempts,
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
      await this.prisma.notificationJob.create({
        data: {
          notificationId,
          status: NotificationJobStatus.PENDING,
          attempts: 0,
          maxAttempts,
          availableAt,
        },
      });
      return;
    } catch (err) {
      if (!isUniqueNotificationIdConflict(err)) {
        throw err;
      }
    }

    // Unique conflict: only re-queue terminal jobs; never reset active ones.
    const updated = await this.prisma.notificationJob.updateMany({
      where: {
        notificationId,
        status: { in: REQUEUEABLE_JOB_STATUSES },
      },
      data: {
        status: NotificationJobStatus.PENDING,
        maxAttempts,
        availableAt,
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        processedAt: null,
      },
    });

    if (updated.count === 0) {
      this.logger.debug(
        `Notification job already queued notificationId=${notificationId} (active or concurrent)`,
      );
    }
  }

  /**
   * Atomically claim up to `limit` available jobs using SKIP LOCKED.
   * Also reclaims stale PROCESSING leases.
   */
  async claimBatch(
    workerId: string,
    limit: number,
  ): Promise<ClaimedNotificationJob[]> {
    const leaseCutoff = new Date(Date.now() - this.config.leaseMs);
    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{
            id: string;
            notification_id: string;
            attempts: number;
            max_attempts: number;
          }>
        >(Prisma.sql`
          SELECT id, notification_id, attempts, max_attempts
          FROM notification_jobs
          WHERE
            (
              status = 'PENDING'::notification_job_status
              AND available_at <= ${now}
            )
            OR (
              status = 'PROCESSING'::notification_job_status
              AND locked_at IS NOT NULL
              AND locked_at < ${leaseCutoff}
            )
          ORDER BY available_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) {
          return [];
        }

        const claimed: ClaimedNotificationJob[] = [];
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
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }

  async markCompleted(jobId: string, workerId: string): Promise<void> {
    await this.updateOwnedJob(jobId, workerId, {
      status: NotificationJobStatus.COMPLETED,
      lockedAt: null,
      lockedBy: null,
      processedAt: new Date(),
      lastError: null,
    });
  }

  async scheduleRetry(
    jobId: string,
    workerId: string,
    attempts: number,
    maxAttempts: number,
    errorMessage: string,
    backoffDelayMs: number,
  ): Promise<'retry' | 'dead'> {
    if (attempts >= maxAttempts) {
      await this.updateOwnedJob(jobId, workerId, {
        status: NotificationJobStatus.DEAD,
        lockedAt: null,
        lockedBy: null,
        lastError: errorMessage,
        processedAt: new Date(),
      });
      return 'dead';
    }

    const delay = backoffDelayMs * Math.pow(2, Math.max(0, attempts - 1));
    await this.updateOwnedJob(jobId, workerId, {
      status: NotificationJobStatus.PENDING,
      availableAt: new Date(Date.now() + delay),
      lockedAt: null,
      lockedBy: null,
      lastError: errorMessage,
    });
    return 'retry';
  }

  async markFailedTerminal(
    jobId: string,
    workerId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updateOwnedJob(jobId, workerId, {
      status: NotificationJobStatus.FAILED,
      lockedAt: null,
      lockedBy: null,
      lastError: errorMessage,
      processedAt: new Date(),
    });
  }

  private async updateOwnedJob(
    jobId: string,
    workerId: string,
    data: Prisma.NotificationJobUpdateManyMutationInput,
  ): Promise<void> {
    const result = await this.prisma.notificationJob.updateMany({
      where: {
        id: jobId,
        lockedBy: workerId,
        status: NotificationJobStatus.PROCESSING,
      },
      data,
    });
    if (result.count === 0) {
      throw new NotificationJobLeaseError(
        `Job ${jobId} is not owned by worker ${workerId} (missing, wrong owner, or not PROCESSING)`,
      );
    }
  }

  async getHealthCounts() {
    const groups = await this.prisma.notificationJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const map = Object.fromEntries(
      groups.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>;

    const delayed = await this.prisma.notificationJob.count({
      where: {
        status: NotificationJobStatus.PENDING,
        availableAt: { gt: new Date() },
      },
    });
    const waiting = await this.prisma.notificationJob.count({
      where: {
        status: NotificationJobStatus.PENDING,
        availableAt: { lte: new Date() },
      },
    });

    return {
      waiting,
      active: map[NotificationJobStatus.PROCESSING] ?? 0,
      completed: map[NotificationJobStatus.COMPLETED] ?? 0,
      failed: map[NotificationJobStatus.FAILED] ?? 0,
      delayed,
      dead: map[NotificationJobStatus.DEAD] ?? 0,
    };
  }

  /** Test helper — generate a stable worker id. */
  static createWorkerId(): string {
    return `pg-worker-${randomUUID()}`;
  }
}
