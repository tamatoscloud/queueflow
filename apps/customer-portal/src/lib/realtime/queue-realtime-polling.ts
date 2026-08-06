/**
 * Polling-only adapter — used as fallback inside hybrid adapter and in tests.
 */
export interface QueueRealtimeSubscription {
  unsubscribe: () => void;
}

export type QueueUpdateHandler<T> = (data: T) => void;

export interface QueueRealtimeAdapter {
  subscribeEntryTracking<T>(
    entryId: string,
    fetcher: () => Promise<T>,
    onUpdate: QueueUpdateHandler<T>,
    intervalMs?: number,
  ): QueueRealtimeSubscription;

  subscribeQueueLanding<T>(
    queueId: string,
    fetcher: () => Promise<T>,
    onUpdate: QueueUpdateHandler<T>,
    intervalMs?: number,
  ): QueueRealtimeSubscription;
}

function poll<T>(
  fetcher: () => Promise<T>,
  onUpdate: QueueUpdateHandler<T>,
  intervalMs: number,
): QueueRealtimeSubscription {
  let active = true;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    if (!active) return;
    try {
      const data = await fetcher();
      onUpdate(data);
    } catch {
      // Errors handled by UI layer
    }
  };

  void tick();
  timer = setInterval(tick, intervalMs);

  return {
    unsubscribe: () => {
      active = false;
      if (timer) clearInterval(timer);
    },
  };
}

export const pollingRealtimeAdapter: QueueRealtimeAdapter = {
  subscribeEntryTracking(_entryId, fetcher, onUpdate, intervalMs = 15_000) {
    return poll(fetcher, onUpdate, intervalMs);
  },
  subscribeQueueLanding(_queueId, fetcher, onUpdate, intervalMs = 30_000) {
    return poll(fetcher, onUpdate, intervalMs);
  },
};
