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
    if (provider === 'mock' || provider === 'http') {
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
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return {
          provider: NotificationProvider.OTHER,
          status: 'FAILED',
          errorCode: String(res.status),
          errorMessage: 'SMS gateway error',
          requestPayload: payload,
          responsePayload: json,
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
      return {
        provider: NotificationProvider.OTHER,
        status: 'FAILED',
        errorCode: 'NETWORK_ERROR',
        errorMessage: String(err),
        requestPayload: payload,
      };
    }
  }
}
