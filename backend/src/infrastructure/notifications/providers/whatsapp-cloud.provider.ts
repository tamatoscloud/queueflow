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
      // Demo / unset credentials: don't fail the queue — log and mark delivered.
      this.logger.warn(
        'WhatsApp credentials missing — delivering via mock (set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID for live sends)',
      );
      const messageId = `wa-mock-${Date.now()}`;
      this.logger.log(
        `WhatsApp mock → ${request.toPhone}: ${request.message.body.slice(0, 120)}`,
      );
      return {
        provider: NotificationProvider.OTHER,
        providerMessageId: messageId,
        status: 'DELIVERED',
        requestPayload: { to: request.toPhone, body: request.message.body, mocked: true },
        responsePayload: { id: messageId, status: 'delivered', simulated: true },
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
          signal: AbortSignal.timeout(10_000),
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
          responsePayload: { ...json, httpStatus: res.status },
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
      const name = err instanceof Error ? err.name : '';
      const timeout = name === 'TimeoutError' || name === 'AbortError';
      return {
        provider: NotificationProvider.META_CLOUD_API,
        status: 'FAILED',
        errorCode: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        errorMessage: String(err),
        requestPayload: payload,
      };
    }
  }
}
