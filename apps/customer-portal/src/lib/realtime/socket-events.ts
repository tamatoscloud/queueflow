/** Shared Socket.IO wire protocol — keep in sync with backend realtime constants. */
export const RealtimeEvents = {
  QueueUpdated: 'QueueUpdated',
  CustomerJoined: 'CustomerJoined',
  CustomerCalled: 'CustomerCalled',
  CustomerHeld: 'CustomerHeld',
  CustomerSkipped: 'CustomerSkipped',
  CustomerCompleted: 'CustomerCompleted',
  QueuePaused: 'QueuePaused',
  QueueResumed: 'QueueResumed',
  QueueClosed: 'QueueClosed',
  EstimatedWaitChanged: 'EstimatedWaitChanged',
} as const;

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

export const RealtimeSubscribe = {
  Entry: 'subscribe:entry',
  Queue: 'subscribe:queue',
  Unsubscribe: 'unsubscribe',
} as const;

export interface RealtimeEnvelope<TPayload = Record<string, unknown>> {
  event: RealtimeEventName;
  occurredAt: string;
  businessId: string;
  queueId: string;
  payload: TPayload;
}

export type RealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'offline';
