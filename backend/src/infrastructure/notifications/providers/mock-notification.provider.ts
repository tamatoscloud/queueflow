import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { NotificationProviderAdapter } from '../domain/notification-provider.interface';
import type { ProviderSendRequest, ProviderSendResult } from '../domain/notification.types';

@Injectable()
export class MockNotificationProvider implements NotificationProviderAdapter {
  readonly name = 'mock';
  private readonly logger = new Logger(MockNotificationProvider.name);

  supports(): boolean {
    return true;
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const simulateFailure = process.env.NOTIFICATION_MOCK_FAIL === 'true';
    if (simulateFailure) {
      return {
        provider: NotificationProvider.OTHER,
        status: 'FAILED',
        errorCode: 'MOCK_FAILURE',
        errorMessage: 'Simulated provider failure',
        requestPayload: { to: request.toPhone, body: request.message.body },
        responsePayload: { simulated: true },
      };
    }

    const messageId = `mock-${randomUUID()}`;
    this.logger.debug(
      `Mock send ${request.channel} to ${request.toPhone}: ${request.message.body.slice(0, 80)}`,
    );
    return {
      provider: NotificationProvider.OTHER,
      providerMessageId: messageId,
      status: 'DELIVERED',
      requestPayload: { to: request.toPhone, body: request.message.body },
      responsePayload: { id: messageId, status: 'delivered', simulated: true },
    };
  }
}
