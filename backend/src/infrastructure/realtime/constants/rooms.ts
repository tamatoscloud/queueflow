/** Socket.IO room naming — single source of truth for server and clients. */
export const RealtimeRooms = {
  /** Public + staff: queue landing, live stats */
  queue: (queueId: string) => `queue:${queueId}`,
  /** Public: customer entry tracker */
  entry: (entryId: string) => `entry:${entryId}`,
  /** Staff: business dashboard aggregates */
  businessDashboard: (businessId: string) => `business:${businessId}:dashboard`,
  /** Staff: queue list for a business */
  businessQueues: (businessId: string) => `business:${businessId}:queues`,
  /** Staff: single queue operations view */
  queueDetail: (queueId: string) => `queue:${queueId}:detail`,
  /** Future TV display — public or token-gated later */
  queueDisplay: (queueId: string) => `queue:${queueId}:display`,
} as const;

export type RealtimeRoomScope =
  | 'queue'
  | 'entry'
  | 'business-dashboard'
  | 'business-queues'
  | 'queue-detail'
  | 'queue-display';
