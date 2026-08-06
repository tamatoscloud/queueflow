import {
  QueueEntryStatus,
  TERMINAL_ENTRY_STATUSES,
} from '../enums';
import { InvalidEntryTransitionError } from '../exceptions/domain-errors';

/**
 * Explicit state machine for QueueEntry.
 *
 * Happy path: WAITING → CALLED → COMPLETED
 * Alternatives (per product requirements):
 *   WAITING → HOLDING → WAITING
 *   WAITING|CALLED → SKIPPED → WAITING (skip parks then requeues at end)
 *   WAITING|HOLDING → CANCELLED
 *   CALLED → NO_SHOW
 *   CALLED → HOLDING (staff parks a called guest)
 *   CALLED → WAITING via skip/requeue paths only through SKIPPED
 */
const ALLOWED: ReadonlyMap<QueueEntryStatus, ReadonlySet<QueueEntryStatus>> =
  new Map([
    [
      QueueEntryStatus.WAITING,
      new Set([
        QueueEntryStatus.CALLED,
        QueueEntryStatus.HOLDING,
        QueueEntryStatus.SKIPPED,
        QueueEntryStatus.CANCELLED,
        QueueEntryStatus.NO_SHOW,
      ]),
    ],
    [
      QueueEntryStatus.CALLED,
      new Set([
        QueueEntryStatus.COMPLETED,
        QueueEntryStatus.HOLDING,
        QueueEntryStatus.SKIPPED,
        QueueEntryStatus.NO_SHOW,
        QueueEntryStatus.CANCELLED,
        QueueEntryStatus.WAITING, // resume after hold is HOLDING→WAITING; recall stays CALLED
      ]),
    ],
    [
      QueueEntryStatus.HOLDING,
      new Set([
        QueueEntryStatus.WAITING,
        QueueEntryStatus.CALLED,
        QueueEntryStatus.CANCELLED,
        QueueEntryStatus.NO_SHOW,
      ]),
    ],
    [
      QueueEntryStatus.SKIPPED,
      new Set([QueueEntryStatus.WAITING]),
    ],
    [QueueEntryStatus.COMPLETED, new Set()],
    [QueueEntryStatus.CANCELLED, new Set()],
    [QueueEntryStatus.NO_SHOW, new Set()],
  ]);

export class EntryLifecyclePolicy {
  static assertCanTransition(
    from: QueueEntryStatus,
    to: QueueEntryStatus,
  ): void {
    if (from === to) {
      return;
    }
    const allowed = ALLOWED.get(from);
    if (!allowed || !allowed.has(to)) {
      throw new InvalidEntryTransitionError(from, to);
    }
  }

  static isTerminal(status: QueueEntryStatus): boolean {
    return (TERMINAL_ENTRY_STATUSES as readonly QueueEntryStatus[]).includes(
      status,
    );
  }

  static canBeCalled(status: QueueEntryStatus): boolean {
    return status === QueueEntryStatus.WAITING;
  }
}
