import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { DEFAULT_TEMPLATES, renderTemplate } from '../templates/template-renderer';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import type { RenderedMessage } from '../domain/notification.types';

@Injectable()
export class NotificationTemplateService {
  constructor(private readonly templates: NotificationTemplateRepository) {}

  async render(
    businessId: string,
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, unknown>,
  ): Promise<RenderedMessage> {
    const dbTemplate = await this.templates.findForSend(
      businessId,
      type,
      channel,
      locale,
    );
    const stringVars = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, v == null ? '' : String(v)]),
    );

    if (dbTemplate) {
      return {
        subject: dbTemplate.subject
          ? renderTemplate(dbTemplate.subject, stringVars)
          : undefined,
        body: renderTemplate(dbTemplate.body, stringVars),
      };
    }

    const key = `${type}_${channel}`;
    const fallback =
      DEFAULT_TEMPLATES[key]?.[locale as 'en' | 'ur'] ??
      DEFAULT_TEMPLATES[key]?.en ??
      `{{businessName}}: ${type}`;
    return {
      body: renderTemplate(fallback, stringVars),
    };
  }
}
