import { QueueEntryStatus } from '../enums';
import type { Queue } from '../entities/queue.entity';
import type { QueueEntry } from '../entities/queue-entry.entity';
import type { QueueMetrics, WaitEstimate } from '../value-objects';
import { OrderingPolicy } from '../policies/queue-policies';
import { clampEstimatedWaitMinutes } from './wait-estimate-bounds';

/**
 * ETA = customersAhead * averageServiceTimeMinutes, clamped to 2.5–30 min.
 * Recalculated after every join / call / complete / reorder.
 */
export class WaitTimeCalculator {
  static estimateForEntry(
    queue: Queue,
    entry: QueueEntry,
    allActive: readonly QueueEntry[],
  ): WaitEstimate {
    const waiting = OrderingPolicy.sortWaiting(allActive, queue.priorityEnabled);
    const index = waiting.findIndex((e) => e.id === entry.id);
    const position = index >= 0 ? index + 1 : waiting.length + 1;
    const customersAhead = Math.max(0, position - 1);
    const estimatedWaitMinutes = clampEstimatedWaitMinutes(
      customersAhead * queue.averageServiceTimeMinutes,
    );
    return {
      position,
      customersAhead,
      estimatedWaitMinutes,
      averageServiceTimeMinutes: queue.averageServiceTimeMinutes,
    };
  }

  static recalculateAll(
    queue: Queue,
    entries: readonly QueueEntry[],
    now: Date,
  ): void {
    const waiting = OrderingPolicy.sortWaiting(entries, queue.priorityEnabled);
    for (let i = 0; i < waiting.length; i++) {
      const entry = waiting[i]!;
      const customersAhead = i;
      entry.updateEstimate(
        i + 1,
        clampEstimatedWaitMinutes(
          customersAhead * queue.averageServiceTimeMinutes,
        ),
        now,
      );
    }
  }
}

export class MetricsCalculator {
  static calculate(
    queue: Queue,
    entries: readonly QueueEntry[],
  ): QueueMetrics {
    const counts = {
      waitingCount: 0,
      calledCount: 0,
      holdingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
      skippedCount: 0,
    };
    const completedWaits: number[] = [];

    for (const e of entries) {
      switch (e.status) {
        case QueueEntryStatus.WAITING:
          counts.waitingCount += 1;
          break;
        case QueueEntryStatus.CALLED:
          counts.calledCount += 1;
          break;
        case QueueEntryStatus.HOLDING:
          counts.holdingCount += 1;
          break;
        case QueueEntryStatus.COMPLETED:
          counts.completedCount += 1;
          if (e.actualWaitMinutes !== null) {
            completedWaits.push(e.actualWaitMinutes);
          }
          break;
        case QueueEntryStatus.CANCELLED:
          counts.cancelledCount += 1;
          break;
        case QueueEntryStatus.NO_SHOW:
          counts.noShowCount += 1;
          break;
        case QueueEntryStatus.SKIPPED:
          counts.skippedCount += 1;
          break;
        default:
          break;
      }
    }

    const occupancy =
      counts.waitingCount +
      counts.calledCount +
      counts.holdingCount +
      counts.skippedCount;

    const averageWaitMinutes =
      completedWaits.length === 0
        ? null
        : Math.round(
            completedWaits.reduce((a, b) => a + b, 0) / completedWaits.length,
          );

    return {
      ...counts,
      averageWaitMinutes,
      averageServiceTimeMinutes: queue.averageServiceTimeMinutes,
      capacity: queue.maxCapacity,
      occupancy,
    };
  }
}
