import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface UpsertTemplateInput {
  businessId: string;
  type: NotificationType;
  channel?: NotificationChannel | null;
  locale?: string;
  subject?: string | null;
  body: string;
  isActive?: boolean;
  actorUserId?: string;
}

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForSend(
    businessId: string,
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
  ) {
    return this.prisma.notificationTemplate.findFirst({
      where: {
        businessId,
        type,
        locale,
        isActive: true,
        OR: [{ channel }, { channel: null }],
      },
      orderBy: [{ channel: 'desc' }],
    });
  }

  listByBusiness(businessId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { businessId },
      orderBy: [{ type: 'asc' }, { channel: 'asc' }, { locale: 'asc' }],
    });
  }

  async upsert(input: UpsertTemplateInput) {
    const channel = input.channel ?? null;
    const locale = input.locale ?? 'en';
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: {
        businessId: input.businessId,
        type: input.type,
        channel,
        locale,
      },
    });
    if (existing) {
      return this.prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: {
          subject: input.subject,
          body: input.body,
          isActive: input.isActive ?? true,
          updatedBy: input.actorUserId,
        },
      });
    }
    return this.prisma.notificationTemplate.create({
      data: {
        businessId: input.businessId,
        type: input.type,
        channel,
        locale,
        subject: input.subject,
        body: input.body,
        isActive: input.isActive ?? true,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
    });
  }

  delete(id: string, businessId: string) {
    return this.prisma.notificationTemplate.deleteMany({
      where: { id, businessId },
    });
  }

  async seedDefaults(businessId: string, templates: UpsertTemplateInput[]) {
    for (const t of templates) {
      await this.upsert({ ...t, businessId });
    }
  }
}
