export const queryKeys = {
  queueLanding: (queueId: string) => ['queue-landing', queueId] as const,
  entryTracking: (entryId: string) => ['entry-tracking', entryId] as const,
};
