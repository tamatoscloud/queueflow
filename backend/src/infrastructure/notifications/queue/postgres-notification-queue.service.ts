import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { notificationQueueConfig } from '../constants/notification-queue.constants';
import { NonRetryableNotificationError } from '../services/notification-dispatcher.service';
import {
  NotificationJobLeaseError,
  NotificationJobRepository,
} from './notification-job.repository';
import {
  NotificationQueueUnavailableError,
  type EnqueueSendOptions,
  type NotificationJobProcessor,
  type NotificationQueueHealthCounts,
  type NotificationQueuePort,
} from './notification-queue.port';

@Injectable()
export class PostgresNotificationQueueService
  implements NotificationQueuePort, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresNotificationQueueService.name);
  private readonly config = notificationQueueConfig();
  private readonly workerId = NotificationJobRepository.createWorkerId();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stopping = false;
  private active = 0;
  private processor: NotificationJobProcessor | null = null;

  constructor(private readonly jobs: NotificationJobRepository) {}

  get isEnabled(): boolean {
    return this.config.enabled && this.config.driver === 'postgres';
  }

  async enqueueSend(
    notificationId: string,
    options?: EnqueueSendOptions,
  ): Promise<void> {
    if (!this.isEnabled) {
      throw new NotificationQueueUnavailableError(
        'PostgreSQL notification queue is disabled',
      );
    }

    try {
      await this.jobs.enqueue(notificationId, {
        delayMs: options?.delayMs,
        force: options?.force,
        maxAttempts: this.config.maxAttempts,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue notification ${notificationId}: ${String(err)}`,
      );
      throw new NotificationQueueUnavailableError(String(err));
    }
  }

  startWorker(processor: NotificationJobProcessor): void {
    if (!this.isEnabled || this.pollTimer) return;
    this.processor = processor;
    this.stopping = false;

    this.pollTimer = setInterval(() => {
      void this.poll();
    }, this.config.pollIntervalMs);

    void this.poll();
    this.logger.log(
      `PostgreSQL notification worker started (concurrency=${this.config.concurrency} pollMs=${this.config.pollIntervalMs} workerId=${this.workerId})`,
    );
  }

  isWorkerRunning(): boolean {
    return this.pollTimer != null && !this.stopping;
  }

  async getHealthCounts(): Promise<NotificationQueueHealthCounts> {
    return this.jobs.getHealthCounts();
  }

  private async poll(): Promise<void> {
    if (this.stopping || !this.processor) return;

    const slots = this.config.concurrency - this.active;
    if (slots <= 0) return;

    const batchSize = Math.min(slots, this.config.claimBatchSize);
    let claimed;
    try {
      claimed = await this.jobs.claimBatch(this.workerId, batchSize);
    } catch (err) {
      this.logger.warn(`PostgreSQL job claim failed: ${String(err)}`);
      return;
    }

    for (const job of claimed) {
      this.active += 1;
      void this.runClaimed(job).finally(() => {
        this.active -= 1;
      });
    }
  }

  private async runClaimed(job: {
    id: string;
    notificationId: string;
    attempts: number;
    maxAttempts: number;
  }): Promise<void> {
    const processor = this.processor;
    if (!processor) return;

    try {
      await processor({
        id: job.id,
        data: { notificationId: job.notificationId, attempt: job.attempts },
        attemptsMade: job.attempts,
      });
    } catch (err) {
      if (err instanceof NonRetryableNotificationError) {
        await this.safeLeaseUpdate('terminal', job.id, () =>
          this.jobs.markFailedTerminal(job.id, this.workerId, err.message),
        );
        this.logger.warn(
          `Notification terminal failure notificationId=${job.notificationId}: ${err.message}`,
        );
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      const outcome = await this.safeLeaseUpdate('retry', job.id, () =>
        this.jobs.scheduleRetry(
          job.id,
          this.workerId,
          job.attempts,
          job.maxAttempts,
          message,
          this.config.backoffDelayMs,
        ),
      );
      if (outcome != null) {
        this.logger.warn(
          `Notification job ${job.id} ${outcome} (attempt ${job.attempts}/${job.maxAttempts}): ${message}`,
        );
      }
      return;
    }

    await this.safeLeaseUpdate('complete', job.id, () =>
      this.jobs.markCompleted(job.id, this.workerId),
    );
  }

  private async safeLeaseUpdate<T>(
    action: string,
    jobId: string,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NotificationJobLeaseError) {
        this.logger.warn(
          `Notification job ${action} skipped (lease lost) jobId=${jobId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    const deadline = Date.now() + 10_000;
    while (this.active > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    this.logger.log('PostgreSQL notification worker stopped');
  }
}
