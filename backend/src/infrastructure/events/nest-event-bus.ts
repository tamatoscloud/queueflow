import { Injectable, Logger } from '@nestjs/common';
import type {
  DomainEvent,
  EventBus,
  EventBusSubscription,
  EventHandler,
} from '../../queue-engine';

/**
 * Nest-hosted EventBus. Logs, retains recent events, and fans out to subscribers
 * (e.g. Socket.IO bridge) without coupling the Queue Engine to transport.
 */
@Injectable()
export class NestEventBus implements EventBus {
  private readonly logger = new Logger(NestEventBus.name);
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  readonly recent: DomainEvent[] = [];

  subscribe(type: string | '*', handler: EventHandler): EventBusSubscription {
    if (type === '*') {
      this.allHandlers.add(handler);
      return { unsubscribe: () => this.allHandlers.delete(handler) };
    }
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return { unsubscribe: () => set!.delete(handler) };
  }

  async publish(event: DomainEvent): Promise<void> {
    this.recent.push(event);
    if (this.recent.length > 500) {
      this.recent.shift();
    }
    this.logger.debug(
      `${event.type} aggregate=${event.aggregateId} business=${event.businessId}`,
    );

    const tasks: Array<void | Promise<void>> = [];
    const typed = this.handlers.get(event.type);
    if (typed) {
      for (const handler of typed) {
        tasks.push(handler(event));
      }
    }
    for (const handler of this.allHandlers) {
      tasks.push(handler(event));
    }
    void Promise.all(tasks).catch((err) => {
      this.logger.warn(`Event handler failed for ${event.type}: ${String(err)}`);
    });
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
