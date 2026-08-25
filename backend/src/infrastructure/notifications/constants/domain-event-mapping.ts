import type { NotificationType } from '@prisma/client';
import type { QueueEngineEventType } from '../../../queue-engine';

/** Maps domain events to notification types for the primary entry in the payload. */
export const DOMAIN_TO_NOTIFICATION_TYPE: Partial<
  Record<QueueEngineEventType, NotificationType>
> = {
  CustomerJoined: 'QUEUE_JOINED',
  CustomerCalled: 'YOUR_TURN',
  CustomerRecalled: 'YOUR_TURN',
  CustomerCancelled: 'QUEUE_CANCELLED',
  CustomerCompleted: 'FEEDBACK_REQUEST',
  /** Hold / no-show / skip use CUSTOM + message body so guests still get SMS/WA when configured. */
  CustomerHeld: 'CUSTOM',
  CustomerNoShow: 'CUSTOM',
  CustomerSkipped: 'CUSTOM',
};

/** Events that should trigger position/wait updates for waiting customers. */
export const WAIT_NOTIFICATION_EVENTS = new Set<QueueEngineEventType>([
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
