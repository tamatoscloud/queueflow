import { NotificationType } from '@prisma/client';

const TEMPLATE_ENV: Record<NotificationType, string> = {
  YOUR_TURN: 'WHATSAPP_TEMPLATE_YOUR_TURN',
  QUEUE_JOINED: 'WHATSAPP_TEMPLATE_QUEUE_JOINED',
  POSITION_UPDATE: 'WHATSAPP_TEMPLATE_POSITION_UPDATE',
  ALMOST_YOUR_TURN: 'WHATSAPP_TEMPLATE_ALMOST_YOUR_TURN',
  QUEUE_CANCELLED: 'WHATSAPP_TEMPLATE_QUEUE_CANCELLED',
  QUEUE_PAUSED: 'WHATSAPP_TEMPLATE_QUEUE_PAUSED',
  QUEUE_RESUMED: 'WHATSAPP_TEMPLATE_QUEUE_RESUMED',
  QUEUE_CLOSED: 'WHATSAPP_TEMPLATE_QUEUE_CLOSED',
  FEEDBACK_REQUEST: 'WHATSAPP_TEMPLATE_FEEDBACK_REQUEST',
  CUSTOM: 'WHATSAPP_TEMPLATE_CUSTOM',
};

/** Body parameter order must match the approved Meta template. */
const TEMPLATE_BODY_KEYS: Record<NotificationType, string[]> = {
  YOUR_TURN: ['displayCode', 'queueName'],
  QUEUE_JOINED: ['customerName', 'queueName', 'displayCode', 'position'],
  POSITION_UPDATE: ['queueName', 'position', 'etaMinutes'],
  ALMOST_YOUR_TURN: ['queueName', 'position'],
  QUEUE_CANCELLED: ['displayCode', 'queueName'],
  QUEUE_PAUSED: ['queueName'],
  QUEUE_RESUMED: ['queueName', 'position'],
  QUEUE_CLOSED: ['queueName', 'displayCode'],
  FEEDBACK_REQUEST: ['queueName', 'feedbackUrl'],
  CUSTOM: ['message'],
};

function textParam(value: unknown): { type: 'text'; text: string } {
  if (value === null || value === undefined) {
    return { type: 'text', text: '-' };
  }
  const text = String(value).trim() || '-';
  return { type: 'text', text: text.slice(0, 1024) };
}

export function whatsappTemplateName(type: NotificationType): string | null {
  const envName = TEMPLATE_ENV[type];
  const value = process.env[envName]?.trim();
  return value || null;
}

export function buildWhatsAppTemplatePayload(input: {
  to: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  fallbackBody?: string;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const name = whatsappTemplateName(input.type);
  if (!name) {
    return {
      ok: false,
      error: `${TEMPLATE_ENV[input.type]} is not set — Meta rejects session text outside the 24h window`,
    };
  }

  const language = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en';
  const meta: Record<string, unknown> = { ...(input.metadata ?? {}) };
  if (input.fallbackBody && !meta.message) {
    meta.message = input.fallbackBody;
  }

  const parameters = TEMPLATE_BODY_KEYS[input.type].map((key) =>
    textParam(meta[key]),
  );

  return {
    ok: true,
    payload: {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'template',
      template: {
        name,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters,
          },
        ],
      },
    },
  };
}
