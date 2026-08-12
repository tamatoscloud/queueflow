import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationLogStatus,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CLAIMABLE_NOTIFICATION_STATUSES,
  STALE_PROCESSING_MS,
  TERMINAL_NOTIFICATION_STATUSES,
} from '../domain/notification-idempotency';
import type {
  ClaimNotificationResult,
  CreateNotificationInput,
  IdempotentCreateResult,
  NotificationDeliveryRecord,
} from '../domain/notification.types';

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(
    data: CreateNotificationInput,
  ): Promise<IdempotentCreateResult> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId,
          queueEntryId: data.queueEntryId ?? null,
          channel: data.channel,
          type: data.type,
          payload: data.payload as Prisma.InputJsonValue,
          status: NotificationStatus.PENDING,
          scheduledAt: data.scheduledAt ?? null,
          createdBy: data.createdBy ?? null,
          idempotencyKey: data.idempotencyKey,
          eventKey: data.eventKey ?? null,
        },
        select: { id: true, status: true },
      });
      return { notification: row, created: true };
    } catch (err) {
      if (!isUniqueViolation(err)) {
        throw err;
      }
      const existing = await this.prisma.notification.findFirst({
        where: { idempotencyKey: data.idempotencyKey, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw err;
      }
      this.logger.debug(
        `Idempotent notification hit key=${data.idempotencyKey} existing=${existing.id}`,
      );
      return { notification: existing, created: false };
    }
  }

  create(data: CreateNotificationInput) {
    return this.createIdempotent(data);
  }

  findById(id: string) {
    return this.prisma.notification.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        queueEntry: { include: { queue: true } },
        business: { include: { settings: true } },
      },
    });
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.notification.findFirst({
      where: { idempotencyKey, deletedAt: null },
    });
  }

  markQueued(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.QUEUED },
    });
  }

  updateStatus(id: string, status: NotificationStatus) {
    return this.prisma.notification.update({
      where: { id },
      data: { status },
    });
  }

  async claimForProcessing(notificationId: string): Promise<ClaimNotificationResult> {
    const claimed = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        deletedAt: null,
        status: { in: [...CLAIMABLE_NOTIFICATION_STATUSES] },
      },
      data: {
        status: NotificationStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    if (claimed.count > 0) {
      return { claimed: true, notificationId };
    }

    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
      select: { id: true, status: true, processingStartedAt: true },
    });

    if (!row) {
      return { claimed: false, reason: 'not_found' };
    }

    if (
      (TERMINAL_NOTIFICATION_STATUSES as readonly string[]).includes(row.status)
    ) {
      return { claimed: false, reason: 'terminal', notificationId: row.id };
    }

    if (row.status === NotificationStatus.FAILED) {
      return { claimed: false, reason: 'terminal', notificationId: row.id };
    }

    if (row.status === NotificationStatus.PROCESSING) {
      const started = row.processingStartedAt?.getTime() ?? 0;
      const stale = Date.now() - started > STALE_PROCESSING_MS;
      if (!stale) {
        return {
          claimed: false,
          reason: 'already_processing',
          notificationId: row.id,
        };
      }

      const reclaimed = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          deletedAt: null,
          status: NotificationStatus.PROCESSING,
          processingStartedAt: row.processingStartedAt,
        },
        data: { processingStartedAt: new Date() },
      });

      if (reclaimed.count > 0) {
        this.logger.warn(
          `Reclaimed stale PROCESSING notification ${notificationId}`,
        );
        return {
          claimed: true,
          notificationId: row.id,
          reason: 'recovered_stale',
        };
      }

      return {
        claimed: false,
        reason: 'already_processing',
        notificationId: row.id,
      };
    }

    return { claimed: false, reason: 'already_processing', notificationId: row.id };
  }

  async recordDelivery(record: NotificationDeliveryRecord) {
    const logStatus =
      record.status === NotificationStatus.DELIVERED
        ? NotificationLogStatus.DELIVERED
        : record.status === NotificationStatus.FAILED
          ? NotificationLogStatus.FAILED
          : NotificationLogStatus.SENT;

    await this.prisma.$transaction([
      this.prisma.notificationLog.create({
        data: {
          notificationId: record.notificationId,
          attemptNumber: record.attemptNumber,
          provider: record.provider,
          status: logStatus,
          providerMessageId: record.providerMessageId,
          errorCode: record.errorCode,
          errorMessage: record.errorMessage,
          requestPayload: record.requestPayload as Prisma.InputJsonValue,
          responsePayload: record.responsePayload as Prisma.InputJsonValue,
          sentAt: record.sentAt,
          deliveredAt: record.deliveredAt,
          failedAt: record.failedAt,
        },
      }),
      this.prisma.notification.update({
        where: { id: record.notificationId },
        data: {
          status: record.status,
          processingStartedAt: null,
        },
      }),
    ]);
  }

  getStats(businessId: string, from?: Date, to?: Date) {
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
    return this.prisma.notification.groupBy({
      by: ['status', 'channel'],
      where,
      _count: { _all: true },
    });
  }

  listFailed(businessId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: NotificationStatus.FAILED,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  findEntryContext(entryId: string) {
    return this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      include: {
        customer: true,
        queue: true,
        queueToken: true,
        business: { include: { settings: true } },
      },
    });
  }

  findWaitingEntriesForQueue(queueId: string) {
    return this.prisma.queueEntry.findMany({
      where: {
        queueId,
        deletedAt: null,
        status: { in: ['WAITING', 'HOLDING', 'SKIPPED'] },
      },
      include: { customer: true, queue: true, queueToken: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  expandChannels(preference: 'WHATSAPP' | 'SMS' | 'BOTH'): NotificationChannel[] {
    if (preference === 'BOTH') return [NotificationChannel.WHATSAPP, NotificationChannel.SMS];
    if (preference === 'WHATSAPP') return [NotificationChannel.WHATSAPP];
    return [NotificationChannel.SMS];
  }

  findPending(limit = 50) {
    return this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
