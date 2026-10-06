import { describe, expect, it, afterEach } from 'vitest';
import { NotificationType } from '@prisma/client';
import { buildWhatsAppTemplatePayload } from '../providers/whatsapp-template.payload';
import { resolveGuestNotificationChannels } from '../guest-notification-channels';

describe('buildWhatsAppTemplatePayload', () => {
  afterEach(() => {
    delete process.env.WHATSAPP_TEMPLATE_YOUR_TURN;
    delete process.env.WHATSAPP_TEMPLATE_LANG;
  });

  it('fails closed when the template name is missing', () => {
    const result = buildWhatsAppTemplatePayload({
      to: '923001234567',
      type: NotificationType.YOUR_TURN,
      metadata: { displayCode: 'A-01', queueName: 'Dine-In' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/WHATSAPP_TEMPLATE_YOUR_TURN/);
    }
  });

  it('builds a Meta template payload with body parameters in order', () => {
    process.env.WHATSAPP_TEMPLATE_YOUR_TURN = 'your_turn';
    process.env.WHATSAPP_TEMPLATE_LANG = 'en';
    const result = buildWhatsAppTemplatePayload({
      to: '923001234567',
      type: NotificationType.YOUR_TURN,
      metadata: { displayCode: 'A-01', queueName: 'Dine-In' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toMatchObject({
      messaging_product: 'whatsapp',
      to: '923001234567',
      type: 'template',
      template: {
        name: 'your_turn',
        language: { code: 'en' },
      },
    });
    const template = result.payload.template as {
      components: Array<{ parameters: Array<{ text: string }> }>;
    };
    expect(template.components[0]?.parameters.map((p) => p.text)).toEqual([
      'A-01',
      'Dine-In',
    ]);
  });
});

describe('resolveGuestNotificationChannels', () => {
  afterEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_HTTP_GATEWAY_URL;
  });

  it('reports WhatsApp off for placeholders', () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'CHANGE_ME_INJECTED_BY_CI';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    expect(resolveGuestNotificationChannels().whatsapp).toBe(false);
  });

  it('reports SMS off when provider is mock', () => {
    process.env.SMS_PROVIDER = 'mock';
    process.env.SMS_HTTP_GATEWAY_URL = 'https://sms.example/send';
    expect(resolveGuestNotificationChannels().sms).toBe(false);
  });

  it('reports live channels when real config is present', () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAAreal';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '10987654321';
    process.env.SMS_PROVIDER = 'http';
    process.env.SMS_HTTP_GATEWAY_URL = 'https://sms.example/send';
    expect(
      resolveGuestNotificationChannels({ webPushEnabled: true }),
    ).toEqual({ whatsapp: true, sms: true, webPush: true });
  });
});
