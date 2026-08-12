import type { Queue } from '../../domain/entities/queue.entity';
import type { QueueEntry } from '../../domain/entities/queue-entry.entity';
import type { Customer } from '../../domain/entities/customer.entity';
import type { DayWindow } from '../../domain/policies/operating-hours-policy';
import type { QueueEntryStatus } from '../../domain/enums';
import type { IssuedToken } from '../../domain/factories/token-factory';

export interface IncrementedTokenCounter {
  tokenNumber: number;
  prefix: string;
}

export interface QueueRepository {
  findById(id: string): Promise<Queue | null>;
  save(queue: Queue): Promise<void>;
  /** Lock the queue row for the duration of the current transaction. */
  lockById(id: string): Promise<Queue | null>;
  /**
   * Atomically increment `lastTokenNumber` and return the new value.
   * Must run while the queue row is locked in the same transaction.
   */
  incrementTokenNumber(queueId: string): Promise<IncrementedTokenCounter>;
}

export interface QueueEntryRepository {
  findById(id: string): Promise<QueueEntry | null>;
  findByQueueId(queueId: string): Promise<QueueEntry[]>;
  findActiveByQueueId(queueId: string): Promise<QueueEntry[]>;
  findActivePhones(
    queueId: string,
  ): Promise<Array<{ entryId: string; phone: string; status: QueueEntryStatus }>>;
  countActive(queueId: string): Promise<number>;
  save(entry: QueueEntry): Promise<void>;
  saveMany(entries: readonly QueueEntry[]): Promise<void>;
  /** Lock the entry row for the duration of the current transaction. */
  lockById(id: string): Promise<QueueEntry | null>;
  /**
   * Atomically claim the next WAITING entry using row-level locking.
   * Returns null when no waiting customer is available.
   */
  claimNextWaiting(
    queueId: string,
    priorityEnabled: boolean,
    actorUserId: string | null,
    now: Date,
  ): Promise<QueueEntry | null>;
}

export interface CustomerRepository {
  findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}

export interface TokenRepository {
  save(token: IssuedToken): Promise<void>;
}

export interface OperatingHoursPort {
  getWindowsForBranch(branchId: string): Promise<DayWindow[]>;
  /** Minutes east of UTC for the branch (e.g. Asia/Karachi ≈ 300). */
  getTimezoneOffsetMinutes(branchId: string): Promise<number>;
}
