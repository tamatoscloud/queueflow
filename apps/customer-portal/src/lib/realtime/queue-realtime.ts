import type { RealtimeEventName } from './socket-events';
import { getSharedSocket } from './socket-client';
import { RealtimeSubscribe } from './socket-events';

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

const LANDING_EVENTS: RealtimeEventName[] = [
  'CustomerJoined',
  'QueueUpdated',
  'QueuePaused',
  'QueueResumed',
  'QueueClosed',
  'EstimatedWaitChanged',
];

function subscribeSocket<T>(
  roomKind: 'entry' | 'queue',
  id: string,
  fetcher: () => Promise<T>,
  onUpdate: QueueUpdateHandler<T>,
  events: RealtimeEventName[],
  fallbackIntervalMs: number,
): QueueRealtimeSubscription {
  const socket = getSharedSocket();
  let active = true;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    if (!active) return;
    try {
      const data = await fetcher();
      onUpdate(data);
    } catch {
      // UI handles errors via query layer
    }
  };

  const startFallback = () => {
    if (pollTimer || !active) return;
    void refresh();
    pollTimer = setInterval(refresh, fallbackIntervalMs);
  };

  const stopFallback = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const onSocketEvent = () => {
    void refresh();
  };

  const subscribeMessage =
    roomKind === 'entry'
      ? { event: RealtimeSubscribe.Entry, body: { entryId: id } }
      : { event: RealtimeSubscribe.Queue, body: { queueId: id } };

  const wireEvents = () => {
    for (const eventName of events) {
      socket.on(eventName, onSocketEvent);
    }
  };

  const unwireEvents = () => {
    for (const eventName of events) {
      socket.off(eventName, onSocketEvent);
    }
  };

  const joinRoom = () => {
    socket.emit(subscribeMessage.event, subscribeMessage.body);
  };

  const onConnect = () => {
    stopFallback();
    joinRoom();
    void refresh();
  };

  const onDisconnect = () => {
    startFallback();
  };

  wireEvents();
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  if (socket.connected) {
    joinRoom();
    void refresh();
  } else {
    socket.connect();
    startFallback();
  }

  return {
    unsubscribe: () => {
      active = false;
      stopFallback();
      unwireEvents();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.emit(RealtimeSubscribe.Unsubscribe, {
        room: roomKind === 'entry' ? `entry:${id}` : `queue:${id}`,
      });
    },
  };
}

export const hybridRealtimeAdapter: QueueRealtimeAdapter = {
  subscribeEntryTracking(entryId, fetcher, onUpdate, intervalMs = 15_000) {
    return subscribeSocket('entry', entryId, fetcher, onUpdate, TRACKING_EVENTS, intervalMs);
  },
  subscribeQueueLanding(queueId, fetcher, onUpdate, intervalMs = 30_000) {
    return subscribeSocket('queue', queueId, fetcher, onUpdate, LANDING_EVENTS, intervalMs);
  },
};

/** Active realtime adapter — Socket.IO with polling fallback. */
export const queueRealtime = hybridRealtimeAdapter;

export { pollingRealtimeAdapter } from './queue-realtime-polling';
