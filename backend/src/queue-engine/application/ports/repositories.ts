import type { Queue } from '../../domain/entities/queue.entity';
import type { QueueEntry } from '../../domain/entities/queue-entry.entity';
import type { Customer } from '../../domain/entities/customer.entity';
import type { DayWindow } from '../../domain/policies/operating-hours-policy';
import type { QueueEntryStatus } from '../../domain/enums';
import type { IssuedToken } from '../../domain/factories/token-factory';

export interface QueueRepository {
  findById(id: string): Promise<Queue | null>;
  save(queue: Queue): Promise<void>;
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
