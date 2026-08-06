import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import type { CreateNotificationInput } from '../domain/notification.types';
import {
  NotificationQueueService,
  NotificationQueueUnavailableError,
} from '../queue/notification-queue.service';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly queue: NotificationQueueService,
  ) {}

  async schedule(input: CreateNotificationInput): Promise<string[]> {
    const channels = [input.channel];
    const ids: string[] = [];

    for (const channel of channels) {
      const row = await this.repository.create({ ...input, channel });
      ids.push(row.id);

      const delayMs = input.scheduledAt
        ? Math.max(0, input.scheduledAt.getTime() - Date.now())
        : 0;

      try {
        await this.repository.markQueued(row.id);
        await this.queue.enqueueSend(row.id, { delayMs });
        this.logger.debug(
          `Scheduled ${input.type} notification ${row.id} on ${channel} (delay ${delayMs}ms)`,
        );
      } catch (err) {
        if (err instanceof NotificationQueueUnavailableError) {
          await this.repository.updateStatus(row.id, NotificationStatus.PENDING);
          this.logger.warn(
            `Notification ${row.id} left PENDING — queue unavailable, will retry when Redis recovers`,
          );
        } else {
          throw err;
        }
      }
    }
    return ids;
  }

  async scheduleForPreference(
    input: Omit<CreateNotificationInput, 'channel'> & {
      preference: 'WHATSAPP' | 'SMS' | 'BOTH';
    },
  ): Promise<string[]> {
    const channels = this.repository.expandChannels(input.preference);
    const ids: string[] = [];
    for (const channel of channels) {
      const created = await this.schedule({ ...input, channel });
      ids.push(...created);
    }
    return ids;
  }

  async retry(notificationId: string): Promise<void> {
    await this.repository.updateStatus(notificationId, NotificationStatus.PENDING);
    try {
      await this.repository.markQueued(notificationId);
      await this.queue.enqueueSend(notificationId, { attempt: 1 });
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
