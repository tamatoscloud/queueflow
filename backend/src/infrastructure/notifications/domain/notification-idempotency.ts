import type { NotificationType } from '@prisma/client';

/** Separator used in deterministic idempotency keys. */
const SEP = ':';

function segment(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '_';
  }
  return String(value).replace(/:/g, '_');
}

/**
 * Primary event-driven notification (join, called, cancelled, feedback).
 * Includes event type so CustomerCalled vs CustomerRecalled remain distinct.
 */
export function buildPrimaryNotificationKey(input: {
  businessId: string;
  queueEntryId: string;
  type: NotificationType;
  eventType: string;
}): string {
  return [
    'primary',
    segment(input.businessId),
    segment(input.queueEntryId),
    segment(input.type),
    segment(input.eventType),
  ].join(SEP);
}

/** Position / wait-time notification — one per position. */
export function buildWaitNotificationKey(input: {
  queueEntryId: string;
  type: NotificationType;
  position: number | null | undefined;
}): string {
  return [
    'wait',
    segment(input.queueEntryId),
    segment(input.type),
    segment(input.position ?? 'unknown'),
  ].join(SEP);
}

/** Queue-wide broadcast — one per event per entry. */
export function buildBroadcastNotificationKey(input: {
  eventType: string;
  queueId: string;
  queueEntryId: string;
}): string {
  return [
    'broadcast',
    segment(input.eventType),
    segment(input.queueId),
    segment(input.queueEntryId),
  ].join(SEP);
}

/** Domain event identity for logging and optional correlation. */
export function buildEventKey(event: {
  type: string;
  aggregateId: string;
  entryId?: string | null;
}): string {
  return [
    segment(event.type),
    segment(event.aggregateId),
    segment(event.entryId ?? null),
  ].join(SEP);
}

/** Terminal notification statuses — no further provider delivery. */
export const TERMINAL_NOTIFICATION_STATUSES = [
  'SENT',
  'DELIVERED',
  'CANCELLED',
] as const;

/** Statuses from which a worker may claim delivery. */
export const CLAIMABLE_NOTIFICATION_STATUSES = ['PENDING', 'QUEUED'] as const;

/** Default stale PROCESSING reclaim threshold (ms). */
export const STALE_PROCESSING_MS = Number(
  process.env.NOTIFICATION_STALE_PROCESSING_MS ?? 5 * 60 * 1000,
);

/** Classify provider errors for BullMQ retry decisions. */
export function isRetryableProviderError(
  errorCode?: string | null,
  httpStatus?: number,
): boolean {
  if (!errorCode) {
    return true;
  }
  const code = errorCode.toUpperCase();
  if (
    code === 'NO_PHONE' ||
    code === 'CONFIG_MISSING' ||
    code === 'INVALID_RECIPIENT' ||
    code === 'UNSUPPORTED_PROVIDER' ||
    code === 'TEMPLATE_ERROR'
  ) {
    return false;
  }
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'ECONNRESET') {
    return true;
  }
  if (httpStatus === 429) {
    return true;
  }
  if (httpStatus !== undefined && httpStatus >= 500) {
    return true;
  }
  if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) {
    return false;
  }
  return true;
}
