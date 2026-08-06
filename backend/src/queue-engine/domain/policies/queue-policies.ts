import { QueueEntryStatus, QueueStatus } from '../enums';
import type { Queue } from '../entities/queue.entity';
import type { QueueEntry } from '../entities/queue-entry.entity';
import {
  InvalidQueueStateError,
  QueueCapacityExceededError,
  QueueNotAcceptingEntriesError,
} from '../exceptions/domain-errors';

export class CapacityPolicy {
  static assertCanJoin(queue: Queue, activeCount: number): void {
    if (queue.status === QueueStatus.CLOSED || queue.status === QueueStatus.ARCHIVED) {
      throw new QueueNotAcceptingEntriesError(queue.id);
    }
    if (queue.status === QueueStatus.PAUSED || !queue.isAcceptingEntries) {
      throw new QueueNotAcceptingEntriesError(queue.id);
    }
    if (queue.maxCapacity !== null && activeCount >= queue.maxCapacity) {
      throw new QueueCapacityExceededError(queue.id, queue.maxCapacity);
    }
  }
}

/**
 * Ordering: VIP / higher priority first when enabled, else FIFO by sortOrder.
 */
export class OrderingPolicy {
  static compare(a: QueueEntry, b: QueueEntry, priorityEnabled: boolean): number {
    if (priorityEnabled) {
      if (a.isVip !== b.isVip) {
        return a.isVip ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  }

  static sortWaiting(
    entries: readonly QueueEntry[],
    priorityEnabled: boolean,
  ): QueueEntry[] {
    return [...entries]
      .filter((e) => e.status === QueueEntryStatus.WAITING)
      .sort((a, b) => OrderingPolicy.compare(a, b, priorityEnabled));
  }

  static nextSortOrder(existing: readonly QueueEntry[]): number {
    if (existing.length === 0) {
      return 1;
    }
    return Math.max(...existing.map((e) => e.sortOrder)) + 1;
  }
}

export class QueueStatePolicy {
  static assertCanOpen(queue: Queue): void {
    if (queue.status === QueueStatus.ARCHIVED) {
      throw new InvalidQueueStateError('Cannot open an archived queue');
    }
    if (queue.status === QueueStatus.ACTIVE && queue.isAcceptingEntries) {
      throw new InvalidQueueStateError('Queue is already open');
    }
  }

  static assertCanPause(queue: Queue): void {
    if (queue.status !== QueueStatus.ACTIVE) {
      throw new InvalidQueueStateError('Only an active queue can be paused');
    }
  }

  static assertCanResume(queue: Queue): void {
    if (queue.status !== QueueStatus.PAUSED) {
      throw new InvalidQueueStateError('Only a paused queue can be resumed');
    }
  }

  static assertCanClose(queue: Queue): void {
    if (queue.status === QueueStatus.CLOSED || queue.status === QueueStatus.ARCHIVED) {
      throw new InvalidQueueStateError('Queue is already closed or archived');
    }
  }
}

/** Default VIP priority bump when joining as VIP on a priority-enabled queue. */
export const VIP_PRIORITY_BUMP = 100;

export class PriorityPolicy {
  static resolveJoinPriority(opts: {
    priorityEnabled: boolean;
    isVip: boolean;
    requestedPriority?: number;
  }): { priority: number; isVip: boolean } {
    const isVip = opts.isVip;
    let priority = opts.requestedPriority ?? 0;
    if (opts.priorityEnabled && isVip && priority < VIP_PRIORITY_BUMP) {
      priority = VIP_PRIORITY_BUMP;
    }
    if (!Number.isInteger(priority) || priority < 0) {
      priority = 0;
    }
    return { priority, isVip };
  }
}
