import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  NotificationStatus,
  Prisma,
  QueueEntryStatus,
  QueueStatus,
  UserStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { paginatedMeta, paginationSkip } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisConnectionService } from '../../infrastructure/redis/redis-connection.service';
import { PasswordService } from '../auth/password.service';
import { AuthRepository } from '../auth/auth.repository';
import { NotificationDispatchService } from '../../infrastructure/notifications/services/notification-dispatch.service';
import { BusinessService } from '../business/business.service';
import type {
  AnalyticsRangeQueryDto,
  CreateSupportTicketDto,
  PlatformAuditQueryDto,
  PlatformBusinessUpdateDto,
  PlatformUserQueryDto,
  UpdateBusinessFeatureFlagsDto,
  UpdateGlobalFeatureFlagsDto,
  UpdatePlatformUserStatusDto,
  UpdateSubscriptionDto,
  UpdateSupportTicketDto,
} from './dto/platform-admin.dto';
import { BusinessStatusDto } from '../business/dto/business.dto';
import type { CreateBusinessDto, ListBusinessQueryDto } from '../business/dto/business.dto';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionService,
    private readonly passwords: PasswordService,
    private readonly authRepo: AuthRepository,
    private readonly dispatch: NotificationDispatchService,
    private readonly businessService: BusinessService,
  ) {}

  async getDashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      businesses,
      activeBranches,
      activeQueues,
      customersServedToday,
      notificationsSent,
      failedNotifications,
      redisHealth,
    ] = await Promise.all([
      this.prisma.business.count({ where: { deletedAt: null } }),
      this.prisma.branch.count({
        where: { deletedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.queue.count({
        where: { deletedAt: null, status: QueueStatus.ACTIVE },
      }),
      this.prisma.queueEntry.count({
        where: {
          deletedAt: null,
          status: QueueEntryStatus.COMPLETED,
          servedAt: { gte: startOfDay },
        },
      }),
      this.prisma.notification.count({
        where: {
          deletedAt: null,
          status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
          createdAt: { gte: startOfDay },
        },
      }),
      this.prisma.notification.count({
        where: { deletedAt: null, status: NotificationStatus.FAILED },
      }),
      this.redis.refreshHealth(),
    ]);

    return {
      kpis: {
        businesses,
        activeBranches,
        activeQueues,
        customersServedToday,
        notificationsSent,
        failedNotifications,
        revenueMrr: null,
        revenueNote: 'Billing integration pending',
      },
      systemHealth: {
        api: 'up',
        redis: redisHealth,
        database: 'up',
        socketIo: 'up',
        notificationWorkers: redisHealth.enabled ? 'up' : 'disabled',
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getSystemHealth() {
    const redis = await this.redis.refreshHealth();
    let dbOk = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    return {
      api: { status: 'up' },
      database: { status: dbOk ? 'up' : 'down' },
      redis,
      socketIo: { status: 'up' },
      notificationQueue: {
        status: redis.enabled ? (redis.status === 'up' ? 'up' : 'degraded') : 'disabled',
      },
    };
  }

  listBusinesses(query: ListBusinessQueryDto) {
    return this.businessService.list(query);
  }

  getBusiness(id: string) {
    return this.businessService.get(id, { businessId: null, isPlatformAdmin: true });
  }

  createBusiness(dto: CreateBusinessDto) {
    return this.businessService.create(dto);
  }

  async updateBusiness(id: string, dto: PlatformBusinessUpdateDto) {
    return this.businessService.update(id, dto, {
      businessId: null,
      isPlatformAdmin: true,
    });
  }

  async deactivateBusiness(id: string) {
    return this.businessService.update(
      id,
      { status: BusinessStatusDto.SUSPENDED },
      { businessId: null, isPlatformAdmin: true },
    );
  }

  async deleteBusiness(id: string) {
    const row = await this.prisma.business.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Business not found');
    await this.prisma.business.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
    return { ok: true };
  }

  async listBranches(businessId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { businessId, deletedAt: null },
      include: {
        _count: { select: { queues: true, userBranches: true } },
      },
      orderBy: { name: 'asc' },
    });
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      city: b.city,
      status: b.status,
      queueCount: b._count.queues,
      staffCount: b._count.userBranches,
    }));
  }

  async listUsers(query: PlatformUserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.status ? { status: query.status as UserStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalItems, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          userRoles: { include: { role: true } },
          business: { select: { id: true, name: true } },
        },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const data = users
      .filter((u) => !query.role || u.userRoles.some((ur) => ur.role.name === query.role))
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        businessId: u.businessId,
        businessName: u.business?.name ?? null,
        roles: u.userRoles.map((ur) => ur.role.name),
        lastLoginAt: u.lastLoginAt,
        isPlatformAdmin: u.businessId === null,
      }));
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async updateUserStatus(userId: string, dto: UpdatePlatformUserStatusDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status as UserStatus },
    });
  }

  async resetUserPassword(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    const temporaryPassword = randomBytes(9).toString('base64url');
    const passwordHash = await this.passwords.hash(temporaryPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.authRepo.revokeAllSessions(userId);
    return { userId, temporaryPassword };
  }

  async listSubscriptions() {
    return this.prisma.subscription.findMany({
      where: { deletedAt: null },
      include: {
        plan: true,
        business: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, deletedAt: null },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status as never } : {}),
        ...(dto.trialEndsAt ? { trialEndsAt: new Date(dto.trialEndsAt) } : {}),
        ...(dto.currentPeriodEnd
          ? { currentPeriodEnd: new Date(dto.currentPeriodEnd) }
          : {}),
      },
      include: { plan: true, business: true },
    });
  }

  async notificationStats() {
    const [byStatus, byChannel] = await Promise.all([
      this.prisma.notification.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    return { byStatus, byChannel };
  }

  async listFailedNotifications(limit = 50) {
    return this.prisma.notification.findMany({
      where: { deletedAt: null, status: NotificationStatus.FAILED },
      include: { business: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async retryNotification(notificationId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Notification not found');
    await this.dispatch.retry(notificationId);
    return { ok: true };
  }

  async listAuditLogs(query: PlatformAuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorUser: { select: { id: true, email: true, fullName: true } },
          business: { select: { id: true, name: true } },
        },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async listSupportTickets() {
    return this.prisma.supportTicket.findMany({
      where: { deletedAt: null },
      include: {
        business: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupportTicket(dto: CreateSupportTicketDto, createdByUserId: string) {
    return this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        businessId: dto.businessId ?? null,
        priority: dto.priority ?? 'MEDIUM',
        createdByUserId,
      },
    });
  }

  async updateSupportTicket(id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assignedToUserId !== undefined
          ? { assignedToUserId: dto.assignedToUserId }
          : {}),
      },
    });
  }

  async getFeatureFlags() {
    const platform = await this.prisma.platformConfig.findUnique({
      where: { id: 'default' },
    });
    return {
      global: (platform?.featureFlags as Record<string, unknown>) ?? {},
      settings: (platform?.settings as Record<string, unknown>) ?? {},
    };
  }

  async updateGlobalFeatureFlags(dto: UpdateGlobalFeatureFlagsDto) {
    const row = await this.prisma.platformConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', featureFlags: dto.featureFlags as Prisma.JsonObject },
      update: { featureFlags: dto.featureFlags as Prisma.JsonObject },
    });
    return row.featureFlags;
  }

  async updateBusinessFeatureFlags(
    businessId: string,
    dto: UpdateBusinessFeatureFlagsDto,
  ) {
    const settings = await this.prisma.businessSettings.findUnique({
      where: { businessId },
    });
    if (!settings) throw new NotFoundException('Business settings not found');
    return this.prisma.businessSettings.update({
      where: { businessId },
      data: { featureFlags: dto.featureFlags as Prisma.JsonObject },
    });
  }

  async getAnalytics(query: AnalyticsRangeQueryDto) {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const [businessGrowth, dailyCustomers, notificationSuccess] =
      await Promise.all([
        this.prisma.business.count({
          where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        }),
        this.prisma.queueEntry.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from, lte: to }, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.notification.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from, lte: to }, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    const avgWait = await this.prisma.queueEntry.aggregate({
      where: {
        deletedAt: null,
        status: QueueEntryStatus.COMPLETED,
        servedAt: { gte: from, lte: to },
        actualWaitMinutes: { not: null },
      },
      _avg: { actualWaitMinutes: true },
    });

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      businessGrowth,
      dailyCustomers,
      notificationSuccess,
      averageWaitMinutes: avgWait._avg.actualWaitMinutes ?? 0,
      peakHoursNote: 'Hourly breakdown available in future analytics release',
    };
  }

  assertPlatformAdmin(isPlatformAdmin: boolean) {
    if (!isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }
  }
}
