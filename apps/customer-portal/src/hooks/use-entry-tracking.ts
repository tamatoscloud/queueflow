'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/lib/api/customer-api';
import { queryKeys } from '@/lib/api/query-keys';
import { queueRealtime } from '@/lib/realtime/queue-realtime';

export const TRACKING_POLL_MS = 15_000;

export function useEntryTracking(entryId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entryTracking(entryId),
    queryFn: () => customerApi.getEntryTracking(entryId),
    staleTime: 5_000,
  });

  useEffect(() => {
    const sub = queueRealtime.subscribeEntryTracking(
      entryId,
      () => customerApi.getEntryTracking(entryId),
      (data) => {
        queryClient.setQueryData(queryKeys.entryTracking(entryId), data);
      },
      TRACKING_POLL_MS,
    );
    return () => sub.unsubscribe();
  }, [entryId, queryClient]);

  return query;
}
