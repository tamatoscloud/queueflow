import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationStatus } from '@prisma/client';
import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationTemplateService } from '../services/notification-template.service';
import type { NotificationJobData } from '../domain/notification.types';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly templates: NotificationTemplateService,
    private readonly providerRegistry: NotificationProviderRegistry,
  ) {}

  async dispatch(job: NotificationJobData): Promise<void> {
    const notification = await this.repository.findById(job.notificationId);
    if (!notification) {
      this.logger.warn(`Notification ${job.notificationId} not found`);
      return;
    }
    if (notification.status === NotificationStatus.CANCELLED) {
      return;
    }

    const settings = notification.business.settings;
    if (settings && !settings.notificationsEnabled) {
      await this.repository.updateStatus(notification.id, NotificationStatus.CANCELLED);
      return;
    }

    const phone = notification.customer.phone;
    if (!phone) {
      await this.repository.recordDelivery({
        notificationId: notification.id,
        status: NotificationStatus.FAILED,
        attemptNumber: job.attempt ?? 1,
        provider: NotificationProvider.OTHER,
        errorCode: 'NO_PHONE',
        errorMessage: 'Customer has no phone number',
        failedAt: new Date(),
      });
      return;
    }

    const message = await this.templates.render(
      notification.businessId,
      notification.type,
      notification.channel,
      settings?.locale ?? 'en',
      (notification.payload as Record<string, unknown>) ?? {},
    );

    const provider = this.providerRegistry.resolve(notification.channel);
    const result = await provider.send({
      notificationId: notification.id,
      businessId: notification.businessId,
      customerId: notification.customerId,
      channel: notification.channel,
      type: notification.type,
      toPhone: phone,
      message,
      metadata: (notification.payload as Record<string, unknown>) ?? {},
    });

    const now = new Date();
    const status =
      result.status === 'FAILED'
        ? NotificationStatus.FAILED
        : result.status === 'DELIVERED'
          ? NotificationStatus.DELIVERED
          : NotificationStatus.SENT;

    await this.repository.recordDelivery({
      notificationId: notification.id,
      status,
      attemptNumber: job.attempt ?? 1,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      requestPayload: result.requestPayload,
      responsePayload: result.responsePayload,
      sentAt: status !== NotificationStatus.FAILED ? now : null,
      deliveredAt: status === NotificationStatus.DELIVERED ? now : null,
      failedAt: status === NotificationStatus.FAILED ? now : null,
    });

    if (status === NotificationStatus.FAILED) {
      throw new Error(result.errorMessage ?? 'Provider delivery failed');
    }
  }
}
