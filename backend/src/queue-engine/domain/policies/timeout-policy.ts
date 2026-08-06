import {
  NoShowTimeoutNotElapsedError,
  RecallTimeoutNotElapsedError,
} from '../exceptions/domain-errors';
import type { Queue } from '../entities/queue.entity';
import type { QueueEntry } from '../entities/queue-entry.entity';

/**
 * Recall / automatic no-show timing.
 * Engine exposes markNoShow / recallCustomer; a future scheduler calls them
 * when timeouts elapse — the policy only encodes the rules.
 */
export class TimeoutPolicy {
  static secondsSinceCalled(entry: QueueEntry, now: Date): number | null {
    if (!entry.calledAt) {
      return null;
    }
    return Math.floor((now.getTime() - entry.calledAt.getTime()) / 1000);
  }

  static assertRecallAllowed(queue: Queue, entry: QueueEntry, now: Date): void {
    const elapsed = TimeoutPolicy.secondsSinceCalled(entry, now);
    if (elapsed === null) {
      throw new RecallTimeoutNotElapsedError(entry.id, queue.recallTimeoutSeconds);
    }
    if (elapsed < queue.recallTimeoutSeconds) {
      throw new RecallTimeoutNotElapsedError(
        entry.id,
        queue.recallTimeoutSeconds - elapsed,
      );
    }
  }

  static assertNoShowAllowed(queue: Queue, entry: QueueEntry, now: Date): void {
    const elapsed = TimeoutPolicy.secondsSinceCalled(entry, now);
    if (elapsed === null) {
      throw new NoShowTimeoutNotElapsedError(entry.id, queue.noShowTimeoutSeconds);
    }
    if (elapsed < queue.noShowTimeoutSeconds) {
      throw new NoShowTimeoutNotElapsedError(
        entry.id,
        queue.noShowTimeoutSeconds - elapsed,
      );
    }
  }

  /** True when a scheduler may auto-mark no-show. */
  static isAutomaticNoShowDue(queue: Queue, entry: QueueEntry, now: Date): boolean {
    const elapsed = TimeoutPolicy.secondsSinceCalled(entry, now);
    return elapsed !== null && elapsed >= queue.noShowTimeoutSeconds;
  }
}
