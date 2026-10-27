'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/lib/api/customer-api';
import type { EntryTracking } from '@/lib/api/types';
import { queryKeys } from '@/lib/api/query-keys';
import { queueRealtime } from '@/lib/realtime/queue-realtime';
import type { RealtimeEnvelope } from '@/lib/realtime/socket-events';
import {
  getTrackingTokenForEntry,
  saveTrackingTokenForEntry,
} from '@/lib/storage/session';
import { isQueueUuid } from '@/lib/queue-id';

/** Backup HTTP poll while waiting — socket patches are primary. */
export const TRACKING_POLL_MS = 8_000;

function persistTokenFromTracking(entryId: string, data: EntryTracking): void {
  if (!data.trackingToken) return;
  saveTrackingTokenForEntry(entryId, data.trackingToken, {
    queueId: data.queue.id,
    displayCode: data.entry.displayCode,
  });
}

function patchTrackingFromRealtime(
  prev: EntryTracking | undefined,
  eventName: string,
  envelope: RealtimeEnvelope | undefined,
  entryId: string,
): EntryTracking | undefined {
  if (!prev) return prev;
  const payload = (envelope?.payload ?? {}) as Record<string, unknown>;

  if (eventName === 'EstimatedWaitChanged') {
    const entries = payload.entries as
      | Array<{
          entryId: string;
          position?: number | null;
          estimatedWaitMinutes?: number | null;
          customersAhead?: number;
        }>
      | undefined;
    const me = entries?.find((e) => e.entryId === entryId);
    if (!me) return prev;
    return {
      ...prev,
      position: typeof me.position === 'number' ? me.position : prev.position,
      customersAhead:
        typeof me.customersAhead === 'number' ? me.customersAhead : prev.customersAhead,
      estimatedWaitMinutes:
        typeof me.estimatedWaitMinutes === 'number'
          ? me.estimatedWaitMinutes
          : prev.estimatedWaitMinutes,
      snapshotGeneratedAt:
        typeof payload.generatedAt === 'string'
          ? payload.generatedAt
          : prev.snapshotGeneratedAt,
    };
  }

  const targetId =
    typeof payload.entryId === 'string' ? payload.entryId : entryId;
  if (targetId !== entryId) return prev;

  if (eventName === 'CustomerCalled') {
    return {
      ...prev,
      entry: {
        ...prev.entry,
        status: 'CALLED',
        calledAt: envelope?.occurredAt ?? new Date().toISOString(),
      },
      position: 0,
      customersAhead: 0,
      estimatedWaitMinutes: 0,
    };
  }
  if (eventName === 'CustomerHeld') {
    return {
      ...prev,
      entry: { ...prev.entry, status: 'HOLDING' },
    };
  }
  if (eventName === 'CustomerSkipped') {
    return {
      ...prev,
      entry: { ...prev.entry, status: 'SKIPPED' },
    };
  }
  if (eventName === 'CustomerCompleted') {
    return {
      ...prev,
      entry: { ...prev.entry, status: 'COMPLETED' },
    };
  }
  if (eventName === 'QueuePaused' || eventName === 'QueueResumed' || eventName === 'QueueClosed') {
    const status =
      eventName === 'QueuePaused'
        ? 'PAUSED'
        : eventName === 'QueueClosed'
          ? 'CLOSED'
          : 'ACTIVE';
    return {
      ...prev,
      queue: {
        ...prev.queue,
        status: status as EntryTracking['queue']['status'],
        isAcceptingEntries: eventName === 'QueueResumed',
      },
    };
  }

  return prev;
}

export function useEntryTracking(entryId: string) {
  const queryClient = useQueryClient();
  const enabled = isQueueUuid(entryId);

  const query = useQuery({
    queryKey: queryKeys.entryTracking(entryId),
    queryFn: async () => {
      const data = await customerApi.getEntryTracking(entryId);
      persistTokenFromTracking(entryId, data);
      return data;
    },
    staleTime: 60_000,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    // Links from push/WhatsApp carry the token in `#t=`; adopt it first.
    const initialToken = getTrackingTokenForEntry(entryId);

    const sub = queueRealtime.subscribeEntryTracking(
      entryId,
      async () => {
        const data = await customerApi.getEntryTracking(entryId);
        persistTokenFromTracking(entryId, data);
        return data;
      },
      (data) => {
        persistTokenFromTracking(entryId, data);
        queryClient.setQueryData(queryKeys.entryTracking(entryId), data);
      },
      {
        trackingToken: initialToken,
        intervalMs: TRACKING_POLL_MS,
        patchFromEvents: true,
        onRealtimeEvent: (eventName, envelope) => {
          queryClient.setQueryData<EntryTracking | undefined>(
            queryKeys.entryTracking(entryId),
            (prev) =>
              patchTrackingFromRealtime(
                prev,
                eventName,
                envelope as RealtimeEnvelope | undefined,
                entryId,
              ),
          );
        },
        recoverToken: async () => {
          const data = await customerApi.getEntryTracking(entryId);
          persistTokenFromTracking(entryId, data);
          queryClient.setQueryData(queryKeys.entryTracking(entryId), data);
          return data.trackingToken ?? null;
        },
        onToken: (token) => {
          saveTrackingTokenForEntry(entryId, token);
        },
      },
    );
    return () => sub.unsubscribe();
  }, [entryId, queryClient, enabled]);

  return query;
}
