import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationStatus } from '@prisma/client';
import { isRetryableProviderError } from '../domain/notification-idempotency';
import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationTemplateService } from '../services/notification-template.service';
import type { NotificationJobData } from '../domain/notification.types';

export class NonRetryableNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableNotificationError';
  }
}

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly templates: NotificationTemplateService,
    private readonly providerRegistry: NotificationProviderRegistry,
  ) {}

  async dispatch(job: NotificationJobData): Promise<void> {
    const claim = await this.repository.claimForProcessing(job.notificationId);
    if (!claim.claimed) {
      if (claim.reason === 'terminal') {
        this.logger.debug(
          `Notification worker skip terminal notificationId=${job.notificationId}`,
        );
      } else if (claim.reason === 'already_processing') {
        this.logger.debug(
          `Notification worker skip in-flight notificationId=${job.notificationId}`,
        );
      } else {
        this.logger.warn(
          `Notification worker skip notificationId=${job.notificationId} reason=${claim.reason}`,
        );
      }
      return;
    }

    if (claim.reason === 'recovered_stale') {
      this.logger.warn(
        `Notification worker recovered stale PROCESSING notificationId=${job.notificationId}`,
      );
    }

    this.logger.log(
      `Notification worker started notificationId=${job.notificationId} attempt=${job.attempt ?? 1}`,
    );

    const notification = await this.repository.findById(job.notificationId);
    if (!notification) {
      this.logger.warn(`Notification ${job.notificationId} not found after claim`);
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
      this.logger.warn(
        `Notification terminal failure notificationId=${notification.id} code=NO_PHONE`,
      );
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
    this.logger.debug(
      `Notification provider attempt notificationId=${notification.id} channel=${notification.channel}`,
    );

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
      const httpStatus =
        typeof result.responsePayload?.httpStatus === 'number'
          ? result.responsePayload.httpStatus
          : undefined;
      const retryable = isRetryableProviderError(result.errorCode, httpStatus);
      this.logger.warn(
        `Notification provider failure notificationId=${notification.id} code=${result.errorCode ?? 'unknown'} retryable=${retryable}`,
      );
      if (!retryable) {
        throw new NonRetryableNotificationError(
          result.errorMessage ?? 'Permanent provider delivery failure',
        );
      }
      throw new Error(result.errorMessage ?? 'Provider delivery failed');
    }

    this.logger.log(
      `Notification provider success notificationId=${notification.id} status=${status}`,
    );
  }
}
