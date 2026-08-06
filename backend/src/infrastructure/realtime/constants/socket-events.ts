/** Wire protocol event names — mirrored on customer portal and future staff apps. */
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

/** Client → server subscription messages */
export const RealtimeSubscribe = {
  Entry: 'subscribe:entry',
  Queue: 'subscribe:queue',
  BusinessDashboard: 'subscribe:business-dashboard',
  BusinessQueues: 'subscribe:business-queues',
  QueueDetail: 'subscribe:queue-detail',
  QueueDisplay: 'subscribe:queue-display',
  Unsubscribe: 'unsubscribe',
} as const;

export interface RealtimeEnvelope<TPayload = Record<string, unknown>> {
  event: RealtimeEventName;
  occurredAt: string;
  businessId: string;
  queueId: string;
  payload: TPayload;
}

export interface EstimatedWaitPayload extends Record<string, unknown> {
  queueId: string;
  businessId: string;
  generatedAt: string;
  waitingCount: number;
  averageServiceTimeMinutes: number;
  entries: Array<{
    entryId: string;
    position: number | null;
    estimatedWaitMinutes: number | null;
    customersAhead: number;
  }>;
}
