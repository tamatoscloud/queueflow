import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import type { DomainEvent } from '../../../queue-engine';
import { QueueEngineService } from '../../../queue-engine';
import { EVENT_BUS } from '../../../common/di/tokens';
import { NestEventBus } from '../../events/nest-event-bus';
import {
  DOMAIN_TO_NOTIFICATION_TYPE,
  WAIT_NOTIFICATION_EVENTS,
} from '../constants/domain-event-mapping';
import { NotificationDispatchService } from '../services/notification-dispatch.service';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class QueueNotificationBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueNotificationBridgeService.name);
  private unsubscribe: (() => void) | null = null;
  private readonly lastPositionNotify = new Map<string, number>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: NestEventBus,
    private readonly dispatch: NotificationDispatchService,
    private readonly repository: NotificationRepository,
    private readonly engine: QueueEngineService,
  ) {}

  onModuleInit(): void {
    const sub = this.eventBus.subscribe('*', (event) => this.handleDomainEvent(event));
    this.unsubscribe = sub.unsubscribe;
    this.logger.log('Subscribed to Queue Engine events for notifications');
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  async handleDomainEvent(event: DomainEvent): Promise<void> {
    try {
      await this.handlePrimaryNotification(event);
      if (WAIT_NOTIFICATION_EVENTS.has(event.type)) {
        await this.handleWaitNotifications(event);
      }
      await this.handleQueueBroadcast(event);
    } catch (err) {
      this.logger.warn(`Notification bridge error for ${event.type}: ${String(err)}`);
    }
  }

  private async handlePrimaryNotification(event: DomainEvent): Promise<void> {
    const type = DOMAIN_TO_NOTIFICATION_TYPE[event.type];
    if (!type) return;

    const entryId = event.payload.entryId;
    if (typeof entryId !== 'string') return;

    const ctx = await this.repository.findEntryContext(entryId);
    if (!ctx?.customer) return;

    const settings = ctx.business.settings;
    if (settings && !settings.notificationsEnabled) return;

    const payload = this.buildEntryPayload(ctx);
    let scheduledAt: Date | undefined;
    if (type === NotificationType.FEEDBACK_REQUEST && settings?.feedbackEnabled) {
      scheduledAt = new Date(
        Date.now() + (settings.feedbackDelaySeconds ?? 60) * 1000,
      );
    } else if (type === NotificationType.FEEDBACK_REQUEST) {
      return;
    }

    await this.dispatch.scheduleForPreference({
      businessId: event.businessId,
      customerId: ctx.customerId,
      queueEntryId: entryId,
      type,
      preference: ctx.notificationPreference,
      payload,
      scheduledAt,
    });
  }

  private async handleQueueBroadcast(event: DomainEvent): Promise<void> {
    const queueId = event.aggregateId;
    let type: NotificationType | null = null;
    if (event.type === 'QueuePaused') type = NotificationType.QUEUE_PAUSED;
    if (event.type === 'QueueResumed') type = NotificationType.QUEUE_RESUMED;
    if (event.type === 'QueueClosed') type = NotificationType.QUEUE_CLOSED;
    if (!type) return;

    const waiting = await this.repository.findWaitingEntriesForQueue(queueId);
    for (const entry of waiting) {
      const payload = {
        queueName: entry.queue.name,
        displayCode: entry.queueToken.displayCode,
        position: entry.lastKnownPosition,
        event: event.type,
      };
      await this.dispatch.scheduleForPreference({
        businessId: event.businessId,
        customerId: entry.customerId,
        queueEntryId: entry.id,
        type,
        preference: entry.notificationPreference,
        payload,
      });
    }
  }

  private async handleWaitNotifications(event: DomainEvent): Promise<void> {
    if (
      event.type === 'CustomerJoined' ||
      event.type === 'CustomerCalled' ||
      event.type === 'CustomerRecalled' ||
      event.type === 'CustomerCompleted' ||
      event.type === 'CustomerCancelled'
    ) {
      return;
    }

    const queueId = event.aggregateId;
    const snapshot = await this.engine.getLiveQueueSnapshot(queueId);
    const settings = snapshot.entries[0]
      ? (
          await this.repository.findEntryContext(snapshot.entries[0].id)
        )?.business.settings
      : null;

    const intervalSec = settings?.positionUpdateIntervalSec ?? 120;
    const almostPosition = settings?.almostYourTurnPosition ?? 3;

    const waiting = snapshot.entries
      .filter((e) => e.status === 'WAITING' || e.status === 'HOLDING')
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

    const now = Date.now();
    for (const entry of waiting) {
      const ctx = await this.repository.findEntryContext(entry.id);
      if (!ctx?.customer) continue;

      const last = this.lastPositionNotify.get(entry.id) ?? 0;
      if (now - last < intervalSec * 1000) continue;

      const estimate = await this.engine.estimateWaitTime(entry.id);
      const type =
        (estimate.position ?? 999) <= almostPosition
          ? NotificationType.ALMOST_YOUR_TURN
          : NotificationType.POSITION_UPDATE;

      await this.dispatch.scheduleForPreference({
        businessId: event.businessId,
        customerId: ctx.customerId,
        queueEntryId: entry.id,
        type,
        preference: ctx.notificationPreference,
        payload: {
          queueName: ctx.queue.name,
          displayCode: ctx.queueToken.displayCode,
          position: estimate.position,
          etaMinutes: estimate.estimatedWaitMinutes,
          customersAhead: estimate.customersAhead,
        },
      });
      this.lastPositionNotify.set(entry.id, now);
    }
  }

  private buildEntryPayload(ctx: {
    lastKnownPosition: number | null;
    queueToken: { displayCode: string };
    queue: { name: string };
    customer: { fullName: string | null };
    business: { name: string };
    id: string;
  }): Record<string, unknown> {
    return {
      customerName: ctx.customer.fullName ?? 'Customer',
      businessName: ctx.business.name,
      queueName: ctx.queue.name,
      displayCode: ctx.queueToken.displayCode,
      position: ctx.lastKnownPosition,
      feedbackUrl: this.dispatch.feedbackUrl(ctx.id),
    };
  }
}
