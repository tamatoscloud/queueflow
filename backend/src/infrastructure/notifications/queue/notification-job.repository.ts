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

@Injectable()
export class NotificationJobRepository {
  private readonly logger = new Logger(NotificationJobRepository.name);
  private readonly config = notificationQueueConfig();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a pending job for a notification (stable unique notification_id).
   * Mirrors BullMQ jobId = send-{notificationId}.
   */
  async enqueue(
    notificationId: string,
    options?: { delayMs?: number; force?: boolean; maxAttempts?: number },
  ): Promise<void> {
    const delayMs = Math.max(0, options?.delayMs ?? 0);
    const availableAt = new Date(Date.now() + delayMs);
    const maxAttempts = options?.maxAttempts ?? this.config.maxAttempts;

    const existing = await this.prisma.notificationJob.findUnique({
      where: { notificationId },
    });

    if (existing && !options?.force) {
      if (
        existing.status === NotificationJobStatus.PENDING ||
        existing.status === NotificationJobStatus.PROCESSING
      ) {
        this.logger.debug(
          `Notification job already queued notificationId=${notificationId} status=${existing.status}`,
        );
        return;
      }
    }

    if (existing) {
      await this.prisma.notificationJob.update({
        where: { notificationId },
        data: {
          status: NotificationJobStatus.PENDING,
          attempts: options?.force ? 0 : existing.attempts,
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

    await this.prisma.notificationJob.create({
      data: {
        notificationId,
        status: NotificationJobStatus.PENDING,
        attempts: 0,
        maxAttempts,
        availableAt,
      },
    });
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

  async markCompleted(jobId: string): Promise<void> {
    await this.prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: NotificationJobStatus.COMPLETED,
        lockedAt: null,
        lockedBy: null,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async scheduleRetry(
    jobId: string,
    attempts: number,
    maxAttempts: number,
    errorMessage: string,
    backoffDelayMs: number,
  ): Promise<'retry' | 'dead'> {
    if (attempts >= maxAttempts) {
      await this.prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: NotificationJobStatus.DEAD,
          lockedAt: null,
          lockedBy: null,
          lastError: errorMessage,
          processedAt: new Date(),
        },
      });
      return 'dead';
    }

    const delay = backoffDelayMs * Math.pow(2, Math.max(0, attempts - 1));
    await this.prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: NotificationJobStatus.PENDING,
        availableAt: new Date(Date.now() + delay),
        lockedAt: null,
        lockedBy: null,
        lastError: errorMessage,
      },
    });
    return 'retry';
  }

  async markFailedTerminal(jobId: string, errorMessage: string): Promise<void> {
    await this.prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: NotificationJobStatus.FAILED,
        lockedAt: null,
        lockedBy: null,
        lastError: errorMessage,
        processedAt: new Date(),
      },
    });
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
