import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import {
  NOTIFICATION_QUEUE,
  type NotificationQueuePort,
} from '../queue/notification-queue.port';
import {
  NotificationDispatcher,
  NonRetryableNotificationError,
} from '../services/notification-dispatcher.service';
import { NotificationDispatchService } from '../services/notification-dispatch.service';

const RECONCILE_INTERVAL_MS = Number(
  process.env.NOTIFICATION_RECONCILE_INTERVAL_MS ?? 60_000,
);

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(NOTIFICATION_QUEUE) private readonly queue: NotificationQueuePort,
    private readonly dispatcher: NotificationDispatcher,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  onModuleInit(): void {
    if (!this.queue.isEnabled) {
      this.logger.warn(
        'Notification worker not started — enable NOTIFICATION_QUEUE_DRIVER=postgres or set REDIS_URL (NOTIFICATION_QUEUE_ENABLED=false to opt out)',
      );
      return;
    }

    this.queue.startWorker(async (job) => {
      try {
        await this.dispatcher.dispatch(job.data);
      } catch (err) {
        if (err instanceof NonRetryableNotificationError) {
          this.logger.warn(
            `Notification terminal failure notificationId=${job.data.notificationId}: ${err.message}`,
          );
          return;
        }
        throw err;
      }
    });
    this.logger.log('NotificationWorker bound to notification queue');

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
