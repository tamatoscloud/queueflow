import type { QueueEngineEventType } from '../../../queue-engine';
import { RealtimeEvents, type RealtimeEventName } from './socket-events';

/** Maps Queue Engine domain events to Socket.IO wire events. */
export const DOMAIN_TO_REALTIME: Partial<Record<QueueEngineEventType, RealtimeEventName>> = {
  QueueUpdated: RealtimeEvents.QueueUpdated,
  QueueCreated: RealtimeEvents.QueueUpdated,
  QueueOpened: RealtimeEvents.QueueUpdated,
  CustomerJoined: RealtimeEvents.CustomerJoined,
  CustomerCalled: RealtimeEvents.CustomerCalled,
  CustomerHeld: RealtimeEvents.CustomerHeld,
  CustomerSkipped: RealtimeEvents.CustomerSkipped,
  CustomerCompleted: RealtimeEvents.CustomerCompleted,
  QueuePaused: RealtimeEvents.QueuePaused,
  QueueResumed: RealtimeEvents.QueueResumed,
  QueueClosed: RealtimeEvents.QueueClosed,
  CustomerCancelled: RealtimeEvents.QueueUpdated,
  CustomerNoShow: RealtimeEvents.QueueUpdated,
  CustomerMoved: RealtimeEvents.QueueUpdated,
  CustomerTransferred: RealtimeEvents.QueueUpdated,
  CustomerRecalled: RealtimeEvents.CustomerCalled,
};

/** Domain events that change wait-time estimates for waiting customers. */
export const WAIT_AFFECTING_DOMAIN_EVENTS = new Set<QueueEngineEventType>([
  'CustomerJoined',
  'CustomerCancelled',
  'CustomerCalled',
  'CustomerHeld',
  'CustomerSkipped',
  'CustomerCompleted',
  'CustomerNoShow',
  'CustomerMoved',
  'CustomerTransferred',
  'QueuePaused',
  'QueueResumed',
  'QueueClosed',
  'QueueUpdated',
  'QueueOpened',
]);
