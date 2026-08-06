import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationProvider } from '@prisma/client';
import type { NotificationProviderAdapter } from '../domain/notification-provider.interface';
import type { ProviderSendRequest, ProviderSendResult } from '../domain/notification.types';

@Injectable()
export class WhatsAppCloudProvider implements NotificationProviderAdapter {
  readonly name = 'whatsapp-cloud';
  private readonly logger = new Logger(WhatsAppCloudProvider.name);

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.WHATSAPP;
  }

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return {
        provider: NotificationProvider.META_CLOUD_API,
        status: 'FAILED',
        errorCode: 'CONFIG_MISSING',
        errorMessage: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured',
      };
    }

    const to = request.toPhone.replace(/\D/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: request.message.body },
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const err = json.error as { message?: string; code?: number } | undefined;
        return {
          provider: NotificationProvider.META_CLOUD_API,
          status: 'FAILED',
          errorCode: String(err?.code ?? res.status),
          errorMessage: err?.message ?? 'WhatsApp API error',
          requestPayload: payload,
          responsePayload: json,
        };
      }
      const messages = json.messages as Array<{ id: string }> | undefined;
      return {
        provider: NotificationProvider.META_CLOUD_API,
        providerMessageId: messages?.[0]?.id,
        status: 'SENT',
        requestPayload: payload,
        responsePayload: json,
      };
    } catch (err) {
      this.logger.warn(`WhatsApp send failed: ${String(err)}`);
      return {
        provider: NotificationProvider.META_CLOUD_API,
        status: 'FAILED',
        errorCode: 'NETWORK_ERROR',
        errorMessage: String(err),
        requestPayload: payload,
      };
    }
  }
}
