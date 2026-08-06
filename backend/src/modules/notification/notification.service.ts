import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginatedMeta,
  paginationSkip,
} from '../../common/dto/pagination.dto';
import { NotificationDispatchService } from '../../infrastructure/notifications/services/notification-dispatch.service';
import { NotificationTemplateRepository } from '../../infrastructure/notifications/repositories/notification-template.repository';
import type {
  ListNotificationQueryDto,
  NotificationStatsQueryDto,
  UpdateNotificationSettingsDto,
  UpsertNotificationTemplateDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateRepository,
  ) {}

  async list(query: ListNotificationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.NotificationWhereInput = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.queueEntryId ? { queueEntryId: query.queueEntryId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: {
          logs: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
      }),
    ]);
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async getLogs(notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    const logs = await this.prisma.notificationLog.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'desc' },
    });
    return { notification, logs };
  }

  async getStats(query: NotificationStatsQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const where: Prisma.NotificationWhereInput = {
      businessId: query.businessId,
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const grouped = await this.prisma.notification.groupBy({
      by: ['status', 'channel', 'type'],
      where,
      _count: { _all: true },
    });
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    const failed = grouped
      .filter((g) => g.status === 'FAILED')
      .reduce((sum, g) => sum + g._count._all, 0);
    const delivered = grouped
      .filter((g) => g.status === 'DELIVERED')
      .reduce((sum, g) => sum + g._count._all, 0);
    return {
      total,
      failed,
      delivered,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
      breakdown: grouped,
    };
  }

  async retryFailed(businessId: string, notificationId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, businessId, deletedAt: null, status: 'FAILED' },
    });
    if (!row) throw new NotFoundException('Failed notification not found');
    await this.dispatch.retry(notificationId);
    return { notificationId, status: 'QUEUED' };
  }

  async getSettings(businessId: string) {
    const settings = await this.prisma.businessSettings.findUnique({
      where: { businessId },
    });
    if (!settings) throw new NotFoundException('Business settings not found');
    return settings;
  }

  async updateSettings(
    businessId: string,
    dto: UpdateNotificationSettingsDto,
    actorUserId?: string,
  ) {
    return this.prisma.businessSettings.update({
      where: { businessId },
      data: {
        ...dto,
        updatedBy: actorUserId,
      },
    });
  }

  listTemplates(businessId: string) {
    return this.templates.listByBusiness(businessId);
  }

  upsertTemplate(
    businessId: string,
    dto: UpsertNotificationTemplateDto,
    actorUserId?: string,
  ) {
    return this.templates.upsert({
      businessId,
      type: dto.type,
      channel: dto.channel,
      locale: dto.locale,
      subject: dto.subject,
      body: dto.body,
      isActive: dto.isActive,
      actorUserId,
    });
  }
}
