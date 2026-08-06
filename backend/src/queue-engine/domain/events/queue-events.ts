/**
 * Domain events published via EventBus after successful mutations.
 * Transport (Socket.IO, Redis pub/sub, etc.) is deliberately not here —
 * only the EventBus port; see docs/QUEUE_ENGINE.md.
 */

export type QueueEngineEventType =
  | 'CustomerJoined'
  | 'CustomerCalled'
  | 'CustomerSkipped'
  | 'CustomerHeld'
  | 'CustomerCompleted'
  | 'CustomerCancelled'
  | 'CustomerNoShow'
  | 'CustomerMoved'
  | 'CustomerTransferred'
  | 'CustomerRecalled'
  | 'QueuePaused'
  | 'QueueResumed'
  | 'QueueClosed'
  | 'QueueOpened'
  | 'QueueUpdated'
  | 'QueueCreated';

export interface DomainEvent<
  TType extends QueueEngineEventType = QueueEngineEventType,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly type: TType;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly businessId: string;
  readonly payload: TPayload;
}

function event<TType extends QueueEngineEventType>(
  type: TType,
  aggregateId: string,
  businessId: string,
  payload: Record<string, unknown>,
  occurredAt: Date,
): DomainEvent<TType> {
  return { type, aggregateId, businessId, payload, occurredAt };
}

export const QueueEvents = {
  created: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('QueueCreated', queueId, businessId, payload, at),

  opened: (queueId: string, businessId: string, at: Date) =>
    event('QueueOpened', queueId, businessId, {}, at),

  paused: (queueId: string, businessId: string, at: Date) =>
    event('QueuePaused', queueId, businessId, {}, at),

  resumed: (queueId: string, businessId: string, at: Date) =>
    event('QueueResumed', queueId, businessId, {}, at),

  closed: (queueId: string, businessId: string, at: Date) =>
    event('QueueClosed', queueId, businessId, {}, at),

  updated: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('QueueUpdated', queueId, businessId, payload, at),

  customerJoined: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerJoined', queueId, businessId, payload, at),

  customerCalled: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerCalled', queueId, businessId, payload, at),

  customerSkipped: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerSkipped', queueId, businessId, payload, at),

  customerHeld: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerHeld', queueId, businessId, payload, at),

  customerCompleted: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerCompleted', queueId, businessId, payload, at),

  customerCancelled: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerCancelled', queueId, businessId, payload, at),

  customerNoShow: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerNoShow', queueId, businessId, payload, at),

  customerMoved: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerMoved', queueId, businessId, payload, at),

  customerTransferred: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerTransferred', queueId, businessId, payload, at),

  customerRecalled: (
    queueId: string,
    businessId: string,
    payload: Record<string, unknown>,
    at: Date,
  ) => event('CustomerRecalled', queueId, businessId, payload, at),
};
