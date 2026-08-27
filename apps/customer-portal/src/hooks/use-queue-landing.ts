'use client';

import { useQuery } from '@tanstack/react-query';
import { customerApi } from '@/lib/api/customer-api';
import { queryKeys } from '@/lib/api/query-keys';
import { isQueueUuid } from '@/lib/queue-id';

const LANDING_POLL_MS = 30_000;

export function useQueueLanding(queueId: string) {
  const enabled = isQueueUuid(queueId);

  return useQuery({
    queryKey: queryKeys.queueLanding(queueId),
    queryFn: () => customerApi.getQueueLanding(queueId),
    staleTime: 20_000,
    refetchInterval: enabled ? LANDING_POLL_MS : false,
    enabled,
  });
}
