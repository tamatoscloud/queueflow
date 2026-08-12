import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import type { CreateNotificationInput, ScheduleNotificationBase } from '../domain/notification.types';
import {
  NOTIFICATION_QUEUE,
  NotificationQueueUnavailableError,
  type NotificationQueuePort,
} from '../queue/notification-queue.port';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly repository: NotificationRepository,
    @Inject(NOTIFICATION_QUEUE) private readonly queue: NotificationQueuePort,
  ) {}

  async schedule(input: CreateNotificationInput): Promise<string[]> {
    const { notification, created } = await this.repository.createIdempotent(input);

    if (!created) {
      this.logger.log(
        `Notification idempotent duplicate notificationId=${notification.id} eventKey=${input.eventKey ?? 'n/a'}`,
      );
      if (
        notification.status === NotificationStatus.SENT ||
        notification.status === NotificationStatus.DELIVERED ||
        notification.status === NotificationStatus.CANCELLED ||
        notification.status === NotificationStatus.PROCESSING ||
        notification.status === NotificationStatus.FAILED
      ) {
        return [notification.id];
      }
    } else {
      this.logger.log(
        `Notification requested notificationId=${notification.id} type=${input.type} channel=${input.channel}`,
      );
    }

    const delayMs = input.scheduledAt
      ? Math.max(0, input.scheduledAt.getTime() - Date.now())
      : 0;

    if (
      notification.status === NotificationStatus.QUEUED ||
      notification.status === NotificationStatus.PROCESSING
    ) {
      return [notification.id];
    }

    try {
      await this.repository.markQueued(notification.id);
      await this.queue.enqueueSend(notification.id, { delayMs });
      this.logger.debug(
        `Notification job queued notificationId=${notification.id} channel=${input.channel} delayMs=${delayMs}`,
      );
    } catch (err) {
      if (err instanceof NotificationQueueUnavailableError) {
        await this.repository.updateStatus(notification.id, NotificationStatus.PENDING);
        this.logger.warn(
          `Notification ${notification.id} left PENDING — queue unavailable`,
        );
      } else {
        throw err;
      }
    }

    return [notification.id];
  }

  async scheduleForPreference(
    input: ScheduleNotificationBase & {
      preference: 'WHATSAPP' | 'SMS' | 'BOTH';
      idempotencyKeyBase: string;
    },
  ): Promise<string[]> {
    const channels = this.repository.expandChannels(input.preference);
    const ids: string[] = [];
    for (const channel of channels) {
      const idempotencyKey = `${input.idempotencyKeyBase}:${channel}`;
      const created = await this.schedule({ ...input, channel, idempotencyKey });
      ids.push(...created);
    }
    return ids;
  }

  async retry(notificationId: string): Promise<void> {
    const row = await this.repository.findById(notificationId);
    if (!row || row.status !== NotificationStatus.FAILED) {
      throw new Error('Only FAILED notifications can be retried');
    }

    await this.repository.updateStatus(notificationId, NotificationStatus.PENDING);
    this.logger.log(`Notification manual retry requested notificationId=${notificationId}`);
    try {
      await this.repository.markQueued(notificationId);
      await this.queue.enqueueSend(notificationId, { attempt: 1, force: true });
    } catch (err) {
      if (err instanceof NotificationQueueUnavailableError) {
        await this.repository.updateStatus(notificationId, NotificationStatus.PENDING);
        throw err;
      }
      throw err;
    }
  }

  buildPayload(
    base: Record<string, unknown>,
    extras?: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...base, ...extras };
  }

  feedbackUrl(entryId: string): string {
    const base = process.env.CUSTOMER_PORTAL_URL ?? 'http://localhost:3001';
    return `${base.replace(/\/$/, '')}/feedback/${entryId}`;
  }

  /** Re-enqueue notifications left PENDING after a Redis outage. */
  async reconcilePending(): Promise<number> {
    if (!this.queue.isEnabled) return 0;
    const pending = await this.repository.findPending();
    let reconciled = 0;
    for (const row of pending) {
      try {
        await this.repository.markQueued(row.id);
        await this.queue.enqueueSend(row.id);
        reconciled += 1;
      } catch (err) {
        if (err instanceof NotificationQueueUnavailableError) {
          await this.repository.updateStatus(row.id, NotificationStatus.PENDING);
          break;
        }
        this.logger.warn(`Reconcile failed for ${row.id}: ${String(err)}`);
      }
    }
    if (reconciled > 0) {
      this.logger.log(`Reconciled ${reconciled} pending notification(s)`);
    }
    return reconciled;
  }
}
