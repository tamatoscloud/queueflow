import {
  NotificationPreference as PrismaNotificationPreference,
  QueueEntrySource as PrismaQueueEntrySource,
  QueueEntryStatus as PrismaQueueEntryStatus,
  QueueStatus as PrismaQueueStatus,
  type Customer as PrismaCustomer,
  type Queue as PrismaQueue,
  type QueueEntry as PrismaQueueEntry,
  type QueueToken as PrismaQueueToken,
} from '@prisma/client';
import {
  Customer,
  NotificationPreference,
  Queue,
  QueueEntry,
  QueueEntrySource,
  QueueEntryStatus,
  QueueStatus,
} from '../../../queue-engine';
import type { QueueProps } from '../../../queue-engine/domain/entities/queue.entity';
import type { QueueEntryProps } from '../../../queue-engine/domain/entities/queue-entry.entity';
import type { CustomerProps } from '../../../queue-engine/domain/entities/customer.entity';

export function toDomainQueue(row: PrismaQueue): Queue {
  const props: QueueProps = {
    id: row.id,
    businessId: row.businessId,
    branchId: row.branchId,
    name: row.name,
    description: row.description,
    status: row.status as QueueStatus,
    prefix: row.prefix,
    maxCapacity: row.maxCapacity,
    averageServiceTimeMinutes: row.averageServiceTimeMinutes,
    isAcceptingEntries: row.isAcceptingEntries,
    autoCallNext: row.autoCallNext,
    priorityEnabled: row.priorityEnabled,
    recallTimeoutSeconds: row.recallTimeoutSeconds,
    noShowTimeoutSeconds: row.noShowTimeoutSeconds,
    notifyBeforeTurns: row.notifyBeforeTurns,
    lastTokenNumber: row.lastTokenNumber,
    lastTokenResetAt: row.lastTokenResetAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
  return Queue.rehydrate(props);
}

export function toPrismaQueueData(queue: Queue) {
  const p = queue.toProps();
  return {
    id: p.id,
    businessId: p.businessId,
    branchId: p.branchId,
    name: p.name,
    description: p.description,
    status: p.status as PrismaQueueStatus,
    prefix: p.prefix,
    maxCapacity: p.maxCapacity,
    averageServiceTimeMinutes: p.averageServiceTimeMinutes,
    isAcceptingEntries: p.isAcceptingEntries,
    autoCallNext: p.autoCallNext,
    priorityEnabled: p.priorityEnabled,
    recallTimeoutSeconds: p.recallTimeoutSeconds,
    noShowTimeoutSeconds: p.noShowTimeoutSeconds,
    notifyBeforeTurns: p.notifyBeforeTurns,
    lastTokenNumber: p.lastTokenNumber,
    lastTokenResetAt: p.lastTokenResetAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
  };
}

export function toDomainCustomer(row: PrismaCustomer): Customer {
  const props: CustomerProps = {
    id: row.id,
    businessId: row.businessId,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    totalVisits: row.totalVisits,
    lastVisitAt: row.lastVisitAt,
    isBlacklisted: row.isBlacklisted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
  return Customer.rehydrate(props);
}

export function toPrismaCustomerData(customer: Customer) {
  const p = customer.toProps();
  return {
    id: p.id,
    businessId: p.businessId,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    notes: p.notes,
    totalVisits: p.totalVisits,
    lastVisitAt: p.lastVisitAt,
    isBlacklisted: p.isBlacklisted,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
  };
}

type EntryRow = PrismaQueueEntry & {
  queueToken: PrismaQueueToken;
  customer: Pick<PrismaCustomer, 'phone' | 'fullName'>;
};

export function toDomainQueueEntry(row: EntryRow): QueueEntry {
  const props: QueueEntryProps = {
    id: row.id,
    businessId: row.businessId,
    branchId: row.branchId,
    queueId: row.queueId,
    customerId: row.customerId,
    queueTokenId: row.queueTokenId,
    displayCode: row.queueToken.displayCode,
    tokenNumber: row.queueToken.tokenNumber,
    status: row.status as QueueEntryStatus,
    source: row.source as QueueEntrySource,
    partySize: row.partySize,
    notes: row.notes,
    notificationPreference:
      row.notificationPreference as NotificationPreference,
    priority: row.priority,
    isVip: row.isVip,
    sortOrder: row.sortOrder,
    lastKnownPosition: row.lastKnownPosition,
    estimatedWaitMinutes: row.estimatedWaitMinutes,
    actualWaitMinutes: row.actualWaitMinutes,
    joinedAt: row.joinedAt,
    calledAt: row.calledAt,
    holdingStartedAt: row.holdingStartedAt,
    skippedAt: row.skippedAt,
    recalledAt: row.recalledAt,
    servedAt: row.servedAt,
    cancelledAt: row.cancelledAt,
    noShowAt: row.noShowAt,
    calledByUserId: row.calledByUserId,
    servedByUserId: row.servedByUserId,
    customerPhone: row.customer.phone,
    customerName: row.customer.fullName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
  return QueueEntry.rehydrate(props);
}

export function toPrismaQueueEntryUpdate(entry: QueueEntry) {
  const p = entry.toProps();
  return {
    businessId: p.businessId,
    branchId: p.branchId,
    queueId: p.queueId,
    customerId: p.customerId,
    queueTokenId: p.queueTokenId,
    status: p.status as PrismaQueueEntryStatus,
    source: p.source as PrismaQueueEntrySource,
    partySize: p.partySize,
    notes: p.notes,
    notificationPreference:
      p.notificationPreference as PrismaNotificationPreference,
    priority: p.priority,
    isVip: p.isVip,
    sortOrder: p.sortOrder,
    lastKnownPosition: p.lastKnownPosition,
    estimatedWaitMinutes:
      p.estimatedWaitMinutes == null
        ? null
        : Math.round(p.estimatedWaitMinutes),
    actualWaitMinutes: p.actualWaitMinutes,
    joinedAt: p.joinedAt,
    calledAt: p.calledAt,
    holdingStartedAt: p.holdingStartedAt,
    skippedAt: p.skippedAt,
    recalledAt: p.recalledAt,
    servedAt: p.servedAt,
    cancelledAt: p.cancelledAt,
    noShowAt: p.noShowAt,
    calledByUserId: p.calledByUserId,
    servedByUserId: p.servedByUserId,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
  };
}

export const ACTIVE_PRISMA_STATUSES: PrismaQueueEntryStatus[] = [
  'WAITING',
  'CALLED',
  'HOLDING',
  'SKIPPED',
];
