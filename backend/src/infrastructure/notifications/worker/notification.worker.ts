import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import {
  NOTIFICATION_QUEUE,
  type NotificationQueuePort,
} from '../queue/notification-queue.port';
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

    // Propagate all errors (including NonRetryableNotificationError) so each
    // queue driver can map them to COMPLETED / FAILED / retry correctly.
    this.queue.startWorker(async (job) => {
      await this.dispatcher.dispatch(job.data);
    });
    this.logger.log('NotificationWorker bound to notification queue');

    // Never let reconcile failures become unhandled rejections — a transient
    // DB blip previously crashed the whole API process mid-demo.
    void this.safeReconcile();
    this.reconcileTimer = setInterval(() => {
      void this.safeReconcile();
    }, RECONCILE_INTERVAL_MS);
  }

  private async safeReconcile(): Promise<void> {
    try {
      await this.dispatch.reconcilePending();
    } catch (err) {
      this.logger.warn(`Notification reconcile skipped: ${String(err)}`);
    }
  }

  onModuleDestroy(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }
}
