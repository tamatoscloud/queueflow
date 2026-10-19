import type { RealtimeEventName } from './socket-events';
import { getSharedSocket } from './socket-client';
import { RealtimeSubscribe } from './socket-events';
import { pollingRealtimeAdapter } from './queue-realtime-polling';

export interface QueueRealtimeSubscription {
  unsubscribe: () => void;
}

export type QueueUpdateHandler<T> = (data: T) => void;

export interface EntryTrackingSubscribeOptions {
  /** Current entry-scoped credential; may be missing until recovery. */
  trackingToken?: string | null;
  /**
   * Recover a fresh token (e.g. via tracking HTTP).
   * Invoked at most once per failure cycle.
   */
  recoverToken?: () => Promise<string | null>;
  /** Persist a recovered/refreshed token (must not log the value). */
  onToken?: (token: string) => void;
  intervalMs?: number;
  /**
   * When true, socket events update React Query via onRealtimeEvent instead of
   * triggering a full HTTP tracking refetch on every event.
   */
  patchFromEvents?: boolean;
  onRealtimeEvent?: (eventName: RealtimeEventName, envelope: unknown) => void;
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

const TRACKING_EVENTS: RealtimeEventName[] = [
  'CustomerCalled',
  'CustomerHeld',
  'CustomerSkipped',
  'CustomerCompleted',
  'QueueUpdated',
  'QueuePaused',
  'QueueResumed',
  'QueueClosed',
  'EstimatedWaitChanged',
];

/** Events that still need a full HTTP refresh even when patching. */
const HTTP_REFRESH_EVENTS = new Set<RealtimeEventName>([
  'QueueUpdated',
  'CustomerCalled',
  'CustomerHeld',
  'CustomerSkipped',
  'CustomerCompleted',
]);

interface SubscribeAck {
  ok?: boolean;
  room?: string;
  error?: string;
}

function subscribeEntrySocket<T>(
  entryId: string,
  fetcher: () => Promise<T>,
  onUpdate: QueueUpdateHandler<T>,
  options: EntryTrackingSubscribeOptions = {},
): QueueRealtimeSubscription {
  const socket = getSharedSocket();
  const reconcileMs = options.intervalMs ?? 8_000;
  const disconnectedMs = Math.min(5_000, reconcileMs);
  let active = true;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentToken = options.trackingToken ?? null;
  let subscribeInFlight = false;
  let refreshGen = 0;

  const refresh = async () => {
    if (!active) return;
    const gen = ++refreshGen;
    try {
      const data = await fetcher();
      // A newer fetch or a newer socket patch started after this request.
      if (!active || gen !== refreshGen) return;
      onUpdate(data);
    } catch {
      // UI handles errors via query layer
    }
  };

  const onWake = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void refresh();
  };

  const startPoll = (ms: number) => {
    if (!active) return;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    pollTimer = setInterval(refresh, ms);
  };

  const startFallback = () => {
    if (!active) return;
    void refresh();
    startPoll(disconnectedMs);
  };

  const stopFallback = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const handlers = new Map<RealtimeEventName, (...args: unknown[]) => void>();

  const onSocketEvent = (eventName: RealtimeEventName, ...args: unknown[]) => {
    const envelope = args[0] as
      | {
          event?: string;
          payload?: { entryId?: string; displayCode?: string; businessName?: string };
        }
      | undefined;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('queueflow:realtime-entry', {
          detail: {
            eventName: envelope?.event ?? eventName,
            entryId: envelope?.payload?.entryId ?? entryId,
            displayCode: envelope?.payload?.displayCode,
            businessName: envelope?.payload?.businessName,
          },
        }),
      );
    }

    if (options.patchFromEvents) {
      options.onRealtimeEvent?.(eventName, envelope);
      if (HTTP_REFRESH_EVENTS.has(eventName)) {
        void refresh();
      }
      return;
    }

    void refresh();
  };

  const wireEvents = () => {
    for (const eventName of TRACKING_EVENTS) {
      const handler = (...args: unknown[]) => onSocketEvent(eventName, ...args);
      handlers.set(eventName, handler);
      socket.on(eventName, handler);
    }
  };

  const unwireEvents = () => {
    for (const eventName of TRACKING_EVENTS) {
      const handler = handlers.get(eventName);
      if (handler) socket.off(eventName, handler);
      handlers.delete(eventName);
    }
  };

  const emitSubscribe = (token: string): Promise<boolean> =>
    new Promise((resolve) => {
      if (!active) {
        resolve(false);
        return;
      }
      try {
        socket
          .timeout(8_000)
          .emit(
            RealtimeSubscribe.Entry,
            { entryId, trackingToken: token },
            (err: Error | null, ack?: SubscribeAck) => {
              if (err || !ack?.ok) {
                resolve(false);
                return;
              }
              resolve(true);
            },
          );
      } catch {
        resolve(false);
      }
    });

  const joinRoom = async () => {
    if (!active || subscribeInFlight) return;
    subscribeInFlight = true;
    let recoveryUsed = false;
    try {
      let token = currentToken;

      if (!token && options.recoverToken) {
        recoveryUsed = true;
        const recovered = await options.recoverToken();
        if (recovered) {
          currentToken = recovered;
          token = recovered;
          options.onToken?.(recovered);
        }
      }

      if (!token) {
        startFallback();
        return;
      }

      let ok = await emitSubscribe(token);
      if (ok) {
        // Keep a backup poll: socket "connected" ≠ room events arriving.
        startPoll(reconcileMs);
        void refresh();
        return;
      }

      // Ack failed — at most one recovery + retry per connect cycle.
      if (options.recoverToken && !recoveryUsed) {
        recoveryUsed = true;
        const recovered = await options.recoverToken();
        if (recovered) {
          currentToken = recovered;
          options.onToken?.(recovered);
          ok = await emitSubscribe(recovered);
          if (ok) {
            startPoll(reconcileMs);
            void refresh();
            return;
          }
        }
      }

      startFallback();
    } finally {
      subscribeInFlight = false;
    }
  };

  const onConnect = () => {
    void joinRoom();
  };

  const onDisconnect = () => {
    startFallback();
  };

  wireEvents();
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onWake);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', onWake);
  }

  if (socket.connected) {
    void joinRoom();
  } else {
    socket.connect();
    startFallback();
  }

  return {
    unsubscribe: () => {
      active = false;
      refreshGen += 1;
      stopFallback();
      unwireEvents();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onWake);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pageshow', onWake);
      }
      socket.emit(RealtimeSubscribe.Unsubscribe, {
        room: `entry:${entryId}`,
      });
    },
  };
}

export const hybridRealtimeAdapter: QueueRealtimeAdapter = {
  subscribeEntryTracking(entryId, fetcher, onUpdate, options) {
    return subscribeEntrySocket(entryId, fetcher, onUpdate, options ?? {});
  },
  /**
   * Public landing must NOT use staff-only `subscribe:queue`.
   * HTTP polling is the source of truth for anonymous visitors.
   */
  subscribeQueueLanding(queueId, fetcher, onUpdate, intervalMs = 30_000) {
    return pollingRealtimeAdapter.subscribeQueueLanding(
      queueId,
      fetcher,
      onUpdate,
      intervalMs,
    );
  },
};

/** Active realtime adapter — entry Socket.IO + landing polling. */
export const queueRealtime = hybridRealtimeAdapter;

export { pollingRealtimeAdapter } from './queue-realtime-polling';
