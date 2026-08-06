import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationQueueService } from '../queue/notification-queue.service';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationDispatchService } from '../services/notification-dispatch.service';

const RECONCILE_INTERVAL_MS = Number(
  process.env.NOTIFICATION_RECONCILE_INTERVAL_MS ?? 60_000,
);

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly queue: NotificationQueueService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  onModuleInit(): void {
    if (!this.queue.isEnabled) {
      this.logger.warn(
        'Notification worker not started — set REDIS_URL or disable with NOTIFICATION_QUEUE_ENABLED=false',
      );
      return;
    }

    this.queue.startWorker(async (job) => {
      await this.dispatcher.dispatch(job.data);
    });
    this.logger.log('NotificationWorker bound to BullMQ queue');

    void this.dispatch.reconcilePending();
    this.reconcileTimer = setInterval(() => {
      void this.dispatch.reconcilePending();
    }, RECONCILE_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }
}
