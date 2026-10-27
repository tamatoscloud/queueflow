import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

function deliverySummary(
  payload: Prisma.JsonValue | null,
  type: string,
  channel: string,
): string {
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const written = record?.message;
  if (typeof written === 'string' && written.trim()) return written.trim();
  const label = type.replaceAll('_', ' ').toLowerCase();
  const code = typeof record?.displayCode === 'string' ? record.displayCode : null;
  const queue = typeof record?.queueName === 'string' ? record.queueName : null;
  return [code, label, queue, channel.toLowerCase()].filter(Boolean).join(' · ');
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateRepository,
  ) {}

  private resolveBusinessId(
    actor: AuthenticatedUser,
    requested?: string,
  ): string {
    if (actor.isPlatformAdmin) {
      if (!requested) {
        throw new ForbiddenException('BUSINESS_CONTEXT_REQUIRED');
      }
      return requested;
    }
    if (!actor.businessId) {
      throw new ForbiddenException('BUSINESS_CONTEXT_REQUIRED');
    }
    if (requested && requested !== actor.businessId) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED');
    }
    return actor.businessId;
  }

  async list(query: ListNotificationQueryDto, actor: AuthenticatedUser) {
    const businessId = this.resolveBusinessId(actor, query.businessId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.NotificationWhereInput = {
      deletedAt: null,
      businessId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.queueEntryId ? { queueEntryId: query.queueEntryId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    // Independent reads run in parallel: a batched $transaction costs
    // BEGIN + each query + COMMIT as sequential DB round trips.
    const [totalItems, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: {
          customer: { select: { phone: true, fullName: true } },
          queueEntry: {
            select: {
              queueId: true,
              queue: { select: { name: true } },
              queueToken: { select: { displayCode: true } },
            },
          },
        },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
      }),
    ]);
    const data = rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      channel: row.channel,
      createdAt: row.createdAt,
      recipientPhone: row.customer?.phone ?? null,
      recipientName: row.customer?.fullName ?? null,
      // Ticket + line so staff can see which guest an alert was for.
      displayCode: row.queueEntry?.queueToken?.displayCode ?? null,
      queueId: row.queueEntry?.queueId ?? null,
      queueName: row.queueEntry?.queue?.name ?? null,
      message: deliverySummary(row.payload, row.type, row.channel),
    }));
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async getLogs(notificationId: string, actor: AuthenticatedUser) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    this.resolveBusinessId(actor, notification.businessId);
    const logs = await this.prisma.notificationLog.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'desc' },
    });
    return { notification, logs };
  }

  async getStats(query: NotificationStatsQueryDto, actor: AuthenticatedUser) {
    const businessId = this.resolveBusinessId(actor, query.businessId);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const where: Prisma.NotificationWhereInput = {
      businessId,
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

  async retryFailed(businessId: string, notificationId: string, actor: AuthenticatedUser) {
    const scopedBusinessId = this.resolveBusinessId(actor, businessId);
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, businessId: scopedBusinessId, deletedAt: null, status: 'FAILED' },
    });
    if (!row) throw new NotFoundException('Failed notification not found');
    await this.dispatch.retry(notificationId);
    return { notificationId, status: 'QUEUED' };
  }

  async getSettings(businessId: string, actor: AuthenticatedUser) {
    const scopedBusinessId = this.resolveBusinessId(actor, businessId);
    const settings = await this.prisma.businessSettings.findUnique({
      where: { businessId: scopedBusinessId },
    });
    if (!settings) throw new NotFoundException('Business settings not found');
    return settings;
  }

  async updateSettings(
    businessId: string,
    dto: UpdateNotificationSettingsDto,
    actor: AuthenticatedUser,
  ) {
    const scopedBusinessId = this.resolveBusinessId(actor, businessId);
    return this.prisma.businessSettings.update({
      where: { businessId: scopedBusinessId },
      data: {
        ...dto,
        updatedBy: actor.id,
      },
    });
  }

  listTemplates(businessId: string, actor: AuthenticatedUser) {
    return this.templates.listByBusiness(this.resolveBusinessId(actor, businessId));
  }

  upsertTemplate(
    businessId: string,
    dto: UpsertNotificationTemplateDto,
    actor: AuthenticatedUser,
  ) {
    const scopedBusinessId = this.resolveBusinessId(actor, businessId);
    return this.templates.upsert({
      businessId: scopedBusinessId,
      type: dto.type,
      channel: dto.channel,
      locale: dto.locale,
      subject: dto.subject,
      body: dto.body,
      isActive: dto.isActive,
      actorUserId: actor.id,
    });
  }
}
