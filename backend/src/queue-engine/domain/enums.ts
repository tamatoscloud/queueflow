/**
 * Domain enums for the Queue Engine.
 * Mirror Prisma enums where they exist; the engine owns these so the
 * domain never imports @prisma/client.
 */

export enum QueueStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum QueueEntryStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  HOLDING = 'HOLDING',
  SKIPPED = 'SKIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum QueueEntrySource {
  QR_LANDING = 'QR_LANDING',
  STAFF_MANUAL = 'STAFF_MANUAL',
  WALK_IN = 'WALK_IN',
}

export enum NotificationPreference {
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  BOTH = 'BOTH',
}

/** Statuses that still occupy a capacity slot / block duplicate phone joins. */
export const ACTIVE_ENTRY_STATUSES: readonly QueueEntryStatus[] = [
  QueueEntryStatus.WAITING,
  QueueEntryStatus.CALLED,
  QueueEntryStatus.HOLDING,
  QueueEntryStatus.SKIPPED,
] as const;

/** Terminal statuses — no further lifecycle transitions. */
export const TERMINAL_ENTRY_STATUSES: readonly QueueEntryStatus[] = [
  QueueEntryStatus.COMPLETED,
  QueueEntryStatus.CANCELLED,
  QueueEntryStatus.NO_SHOW,
] as const;
