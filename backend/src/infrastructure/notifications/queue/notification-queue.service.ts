import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import {
  NOTIFICATION_DLQ_NAME,
  NOTIFICATION_JOB_SEND,
  NOTIFICATION_QUEUE_NAME,
  notificationQueueConfig,
} from '../constants/notification-queue.constants';
import type { NotificationJobData } from '../domain/notification.types';
import { RedisConnectionService } from '../../redis/redis-connection.service';

export type NotificationJobProcessor = (job: Job<NotificationJobData>) => Promise<void>;

export class NotificationQueueUnavailableError extends Error {
  constructor(message = 'Notification queue is temporarily unavailable') {
    super(message);
    this.name = 'NotificationQueueUnavailableError';
  }
}

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly config = notificationQueueConfig();
  private queue: Queue<NotificationJobData> | null = null;
  private dlq: Queue<NotificationJobData> | null = null;
  private worker: Worker<NotificationJobData> | null = null;
  private queueConnection: ReturnType<RedisConnectionService['createConnection']> | null =
    null;
  private workerConnection: ReturnType<RedisConnectionService['createConnection']> | null =
    null;
  private dlqConnection: ReturnType<RedisConnectionService['createConnection']> | null =
    null;

  constructor(private readonly redis: RedisConnectionService) {}

  get isEnabled(): boolean {
    return this.config.enabled && this.redis.config.enabled;
  }

  private ensureQueueConnection() {
    if (!this.queueConnection) {
      this.queueConnection = this.redis.createConnection('notifications-queue');
    }
    return this.queueConnection;
  }

  private ensureWorkerConnection() {
    if (!this.workerConnection) {
      this.workerConnection = this.redis.createConnection('notifications-worker');
    }
    return this.workerConnection;
  }

  private ensureDlqConnection() {
    if (!this.dlqConnection) {
      this.dlqConnection = this.redis.createConnection('notifications-dlq');
    }
    return this.dlqConnection;
  }

  getQueue(): Queue<NotificationJobData> {
    if (!this.queue) {
      this.queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
        connection: this.ensureQueueConnection(),
        defaultJobOptions: {
          attempts: this.config.maxAttempts,
          backoff: { type: 'exponential', delay: this.config.backoffDelayMs },
          removeOnComplete: this.config.removeOnComplete,
          removeOnFail: false,
        },
      });
    }
    return this.queue;
  }

  getDlq(): Queue<NotificationJobData> {
    if (!this.dlq) {
      this.dlq = new Queue<NotificationJobData>(NOTIFICATION_DLQ_NAME, {
        connection: this.ensureDlqConnection(),
      });
    }
    return this.dlq;
  }

  async enqueueSend(
    notificationId: string,
    options?: { delayMs?: number; attempt?: number },
  ): Promise<void> {
    if (!this.isEnabled) {
      throw new NotificationQueueUnavailableError('Notification queue is disabled');
    }

    if (!this.redis.isAvailable()) {
      throw new NotificationQueueUnavailableError('Redis is not available');
    }

    try {
      const queue = this.getQueue();
      const delay = options?.delayMs ?? 0;
      await queue.add(
        NOTIFICATION_JOB_SEND,
        { notificationId, attempt: options?.attempt ?? 1 },
        {
          jobId: `${notificationId}-${Date.now()}`,
          delay,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue notification ${notificationId}: ${String(err)}`,
      );
      throw new NotificationQueueUnavailableError(String(err));
    }
  }

  startWorker(processor: NotificationJobProcessor): void {
    if (!this.isEnabled || this.worker) return;

    this.worker = new Worker<NotificationJobData>(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        try {
          await processor(job);
        } catch (err) {
          const maxAttempts = this.config.maxAttempts;
          if (job.attemptsMade + 1 >= maxAttempts) {
            try {
              await this.getDlq().add(NOTIFICATION_JOB_SEND, job.data, {
                jobId: `dlq-${job.data.notificationId}-${Date.now()}`,
              });
            } catch (dlqErr) {
              this.logger.error(
                `Failed to move job ${job.id} to DLQ: ${String(dlqErr)}`,
              );
            }
          }
          throw err;
        }
      },
      {
        connection: this.ensureWorkerConnection(),
        concurrency: this.config.concurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(
        `Notification job ${job?.id} failed (attempt ${job?.attemptsMade}): ${String(err)}`,
      );
    });

    this.worker.on('error', (err) => {
      this.logger.warn(`Notification worker error: ${String(err)}`);
    });

    this.logger.log(
      `Notification worker started (concurrency=${this.config.concurrency})`,
    );
  }

  isWorkerRunning(): boolean {
    return this.worker != null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.dlq?.close();
    await Promise.all([
      this.queueConnection?.quit().catch(() => undefined),
      this.workerConnection?.quit().catch(() => undefined),
      this.dlqConnection?.quit().catch(() => undefined),
    ]);
    this.queueConnection = null;
    this.workerConnection = null;
    this.dlqConnection = null;
  }
}
