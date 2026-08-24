'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/lib/api/customer-api';
import type { EntryTracking } from '@/lib/api/types';
import { queryKeys } from '@/lib/api/query-keys';
import { queueRealtime } from '@/lib/realtime/queue-realtime';
import {
  loadQueueSession,
  saveTrackingTokenForEntry,
} from '@/lib/storage/session';
import { isQueueUuid } from '@/lib/queue-id';

/** Fallback when socket is slow/offline — keep short so "Call" feels instant. */
export const TRACKING_POLL_MS = 5_000;

function persistTokenFromTracking(entryId: string, data: EntryTracking): void {
  if (!data.trackingToken) return;
  saveTrackingTokenForEntry(entryId, data.trackingToken, {
    queueId: data.queue.id,
    displayCode: data.entry.displayCode,
  });
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
    staleTime: 5_000,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const session = loadQueueSession();
    const initialToken =
      session?.entryId === entryId ? session.trackingToken : undefined;

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
