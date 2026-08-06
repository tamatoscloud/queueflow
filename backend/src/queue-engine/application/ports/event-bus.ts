import type { DomainEvent } from '../../domain/events/queue-events';

/**
 * Internal event bus. Implementations may fan out to Socket.IO / Redis later;
 * the Queue Engine only depends on this port.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
  subscribe(type: string | '*', handler: EventHandler): EventBusSubscription;
}

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export interface EventBusSubscription {
  unsubscribe(): void;
}
