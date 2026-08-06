import type { DomainEvent } from '../../domain/events/queue-events';
import type {
  EventBus,
  EventBusSubscription,
  EventHandler,
} from '../../application/ports/event-bus';

/**
 * In-process EventBus for unit tests and single-process deployments.
 * Socket.IO / Redis adapters implement the same EventBus interface later.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  readonly published: DomainEvent[] = [];

  subscribe(type: string | '*', handler: EventHandler): EventBusSubscription {
    if (type === '*') {
      this.allHandlers.add(handler);
      return {
        unsubscribe: () => {
          this.allHandlers.delete(handler);
        },
      };
    }
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return {
      unsubscribe: () => {
        set!.delete(handler);
      },
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
    const typed = this.handlers.get(event.type);
    const tasks: Array<void | Promise<void>> = [];
    if (typed) {
      for (const h of typed) {
        tasks.push(h(event));
      }
    }
    for (const h of this.allHandlers) {
      tasks.push(h(event));
    }
    await Promise.all(tasks);
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  clear(): void {
    this.published.length = 0;
  }
}
