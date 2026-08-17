'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/lib/api/customer-api';
import { queryKeys } from '@/lib/api/query-keys';
import { isQueueUuid } from '@/lib/queue-id';
import { queueRealtime } from '@/lib/realtime/queue-realtime';

const LANDING_POLL_MS = 30_000;

export function useQueueLanding(queueId: string) {
  const queryClient = useQueryClient();
  const enabled = isQueueUuid(queueId);

  const query = useQuery({
    queryKey: queryKeys.queueLanding(queueId),
    queryFn: () => customerApi.getQueueLanding(queueId),
    staleTime: 10_000,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const sub = queueRealtime.subscribeQueueLanding(
      queueId,
      () => customerApi.getQueueLanding(queueId),
      (data) => {
        queryClient.setQueryData(queryKeys.queueLanding(queueId), data);
      },
      LANDING_POLL_MS,
    );
    return () => sub.unsubscribe();
  }, [queueId, queryClient, enabled]);

  return query;
}
