import type { Customer, Queue, QueueEntry, QueueToken } from '@prisma/client';

export type CustomerResponse = Pick<
  Customer,
  'id' | 'businessId' | 'fullName' | 'phone' | 'email' | 'createdAt' | 'updatedAt'
> & { totalVisits?: number };

export type ActiveEntryResponse = QueueEntry & {
  queue: Queue;
  queueToken: QueueToken;
};

type CustomerWithEntries = Customer & {
  queueEntries?: ActiveEntryResponse[];
  _count?: { queueEntries: number };
};

export function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: customer.id,
    businessId: customer.businessId,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export function toCustomerListItem(customer: CustomerWithEntries) {
  const latest = customer.queueEntries?.[0];
  return {
    ...toCustomerResponse(customer),
    totalVisits: customer._count?.queueEntries ?? 0,
    activeStatus: latest?.status ?? null,
    displayCode: latest?.queueToken?.displayCode ?? null,
    queueName: latest?.queue?.name ?? null,
    entryId: latest?.id ?? null,
  };
}

export function toHistoryEntryResponse(
  entry: QueueEntry & { queue: Queue; queueToken: QueueToken },
) {
  return {
    entryId: entry.id,
    id: entry.id,
    queueName: entry.queue?.name ?? '',
    status: entry.status,
    joinedAt: entry.joinedAt,
    completedAt: entry.servedAt,
    displayCode: entry.queueToken?.displayCode ?? null,
  };
}

export function toActiveStatusResponse(
  customer: Customer,
  activeEntries: ActiveEntryResponse[],
) {
  return {
    customer: toCustomerResponse(customer),
    activeEntries,
    hasActiveEntry: activeEntries.length > 0,
  };
}
