import type { Customer, Queue, QueueEntry, QueueToken } from '@prisma/client';

export type CustomerResponse = Pick<
  Customer,
  'id' | 'businessId' | 'fullName' | 'phone' | 'email' | 'createdAt' | 'updatedAt'
>;

export type ActiveEntryResponse = QueueEntry & {
  queue: Queue;
  queueToken: QueueToken;
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
