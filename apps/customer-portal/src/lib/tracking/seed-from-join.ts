import type { EntryTracking, JoinQueueResult, QueueLanding } from '@/lib/api/types';

/** Optimistic track payload so join → waiting skips a blank skeleton round-trip. */
export function buildTrackingFromJoin(
  result: JoinQueueResult,
  landing: QueueLanding,
  extras?: { partySize?: number; notes?: string | null },
): EntryTracking {
  return {
    entry: {
      id: result.entryId,
      status: 'WAITING',
      displayCode: result.displayCode,
      partySize: extras?.partySize ?? 1,
      joinedAt: new Date().toISOString(),
      calledAt: null,
      notes: extras?.notes ?? null,
      metadata: {},
    },
    queue: {
      id: landing.queue.id,
      name: landing.queue.name,
      status: landing.queue.status,
      isAcceptingEntries: landing.queue.isAcceptingEntries,
      serviceMode: landing.queue.serviceMode,
    },
    business: landing.business,
    branch: { id: landing.branch.id, name: landing.branch.name },
    position: result.estimate.position,
    customersAhead: result.estimate.customersAhead,
    estimatedWaitMinutes: result.estimate.estimatedWaitMinutes,
    averageServiceTimeMinutes: result.estimate.averageServiceTimeMinutes,
    snapshotGeneratedAt: new Date().toISOString(),
    trackingToken: result.trackingToken,
  };
}
