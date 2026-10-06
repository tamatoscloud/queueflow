import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationProvider } from '@prisma/client';
import type { NotificationProviderAdapter } from '../domain/notification-provider.interface';
import type { ProviderSendRequest, ProviderSendResult } from '../domain/notification.types';

@Injectable()
export class SmsNotificationProvider implements NotificationProviderAdapter {
  readonly name = 'sms';
  private readonly logger = new Logger(SmsNotificationProvider.name);

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.SMS;
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const provider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
    const url = process.env.SMS_HTTP_GATEWAY_URL;
    const allowMock =
      process.env.NOTIFICATION_USE_MOCK === 'true' ||
      process.env.NODE_ENV !== 'production';
    // Without a real gateway: mock in non-prod / explicit mock mode; fail closed in production.
    if (provider === 'mock' || !url) {
      if (!allowMock) {
        this.logger.error(
          'SMS gateway not configured in production — refusing mock delivery',
        );
        return {
          provider: NotificationProvider.OTHER,
          status: 'FAILED',
          errorCode: 'CONFIG_MISSING',
          errorMessage:
            'SMS_HTTP_GATEWAY_URL missing (set gateway or NOTIFICATION_USE_MOCK=true for demos)',
          requestPayload: { to: request.toPhone, mocked: false },
        };
      }
      if (!url && provider !== 'mock') {
        this.logger.warn(
          'SMS_HTTP_GATEWAY_URL missing — delivering via mock (set gateway or NOTIFICATION_USE_MOCK=true)',
        );
      }
      const messageId = `sms-mock-${Date.now()}`;
      this.logger.log(
        `SMS mock → ${request.toPhone}: ${request.message.body.slice(0, 120)}`,
      );
      return {
        provider: NotificationProvider.OTHER,
        providerMessageId: messageId,
        status: 'DELIVERED',
        requestPayload: { to: request.toPhone, body: request.message.body, mocked: true },
        responsePayload: { id: messageId, status: 'delivered', simulated: true },
      };
    }
    if (provider === 'http') {
      return this.sendViaHttpGateway(request);
    }
    return {
      provider: NotificationProvider.TWILIO,
      status: 'FAILED',
      errorCode: 'UNSUPPORTED_PROVIDER',
      errorMessage: `SMS provider "${provider}" is not configured`,
    };
  }

  private async sendViaHttpGateway(
    request: ProviderSendRequest,
  ): Promise<ProviderSendResult> {
    const url = process.env.SMS_HTTP_GATEWAY_URL;
    if (!url) {
      return {
        provider: NotificationProvider.OTHER,
        status: 'FAILED',
        errorCode: 'CONFIG_MISSING',
        errorMessage: 'SMS_HTTP_GATEWAY_URL not configured',
      };
    }

    const payload = {
      to: request.toPhone,
      message: request.message.body,
      senderId: process.env.SMS_SENDER_ID,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return {
          provider: NotificationProvider.OTHER,
          status: 'FAILED',
          errorCode: String(res.status),
          errorMessage: 'SMS gateway error',
          requestPayload: payload,
          responsePayload: { ...json, httpStatus: res.status },
        };
      }
      return {
        provider: NotificationProvider.OTHER,
        providerMessageId: String(json.id ?? json.messageId ?? ''),
        status: 'SENT',
        requestPayload: payload,
        responsePayload: json,
      };
    } catch (err) {
      this.logger.warn(`SMS send failed: ${String(err)}`);
      const name = err instanceof Error ? err.name : '';
      const timeout = name === 'TimeoutError' || name === 'AbortError';
      return {
        provider: NotificationProvider.OTHER,
        status: 'FAILED',
        errorCode: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        errorMessage: String(err),
        requestPayload: payload,
      };
    }
  }
}
