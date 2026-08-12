/**
 * Polling-only adapter — used for public landing and as fallback inside hybrid entry tracking.
 */
export interface QueueRealtimeSubscription {
  unsubscribe: () => void;
}

export type QueueUpdateHandler<T> = (data: T) => void;

export interface EntryTrackingSubscribeOptions {
  trackingToken?: string | null;
  recoverToken?: () => Promise<string | null>;
  onToken?: (token: string) => void;
  intervalMs?: number;
}

export interface QueueRealtimeAdapter {
  subscribeEntryTracking<T>(
    entryId: string,
    fetcher: () => Promise<T>,
    onUpdate: QueueUpdateHandler<T>,
    options?: EntryTrackingSubscribeOptions,
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
  subscribeEntryTracking(_entryId, fetcher, onUpdate, options) {
    return poll(fetcher, onUpdate, options?.intervalMs ?? 15_000);
  },
  subscribeQueueLanding(_queueId, fetcher, onUpdate, intervalMs = 30_000) {
    return poll(fetcher, onUpdate, intervalMs);
  },
};
