import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationLogStatus,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  CreateNotificationInput,
  NotificationDeliveryRecord,
} from '../domain/notification.types';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNotificationInput) {
    return this.prisma.notification.create({
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
      },
    });
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
        data: { status: record.status },
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
