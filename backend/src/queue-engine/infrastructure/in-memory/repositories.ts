import type { Queue } from '../../domain/entities/queue.entity';
import type { QueueEntry } from '../../domain/entities/queue-entry.entity';
import type { Customer } from '../../domain/entities/customer.entity';
import { ACTIVE_ENTRY_STATUSES, type QueueEntryStatus } from '../../domain/enums';
import type { IssuedToken } from '../../domain/factories/token-factory';
import type { DayWindow } from '../../domain/policies/operating-hours-policy';
import type {
  CustomerRepository,
  OperatingHoursPort,
  QueueEntryRepository,
  QueueRepository,
  TokenRepository,
} from '../../application/ports/repositories';

export class InMemoryQueueRepository implements QueueRepository {
  private readonly byId = new Map<string, Queue>();

  async findById(id: string): Promise<Queue | null> {
    return this.byId.get(id) ?? null;
  }

  async save(queue: Queue): Promise<void> {
    this.byId.set(queue.id, queue);
  }

  clear(): void {
    this.byId.clear();
  }
}

export class InMemoryQueueEntryRepository implements QueueEntryRepository {
  private readonly byId = new Map<string, QueueEntry>();

  async findById(id: string): Promise<QueueEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async findByQueueId(queueId: string): Promise<QueueEntry[]> {
    return [...this.byId.values()].filter((e) => e.queueId === queueId);
  }

  async findActiveByQueueId(queueId: string): Promise<QueueEntry[]> {
    return (await this.findByQueueId(queueId)).filter((e) =>
      (ACTIVE_ENTRY_STATUSES as readonly QueueEntryStatus[]).includes(e.status),
    );
  }

  async findActivePhones(
    queueId: string,
  ): Promise<Array<{ entryId: string; phone: string; status: QueueEntryStatus }>> {
    const active = await this.findActiveByQueueId(queueId);
    return active.map((e) => ({
      entryId: e.id,
      phone: e.customerPhone,
      status: e.status,
    }));
  }

  async countActive(queueId: string): Promise<number> {
    return (await this.findActiveByQueueId(queueId)).length;
  }

  async save(entry: QueueEntry): Promise<void> {
    this.byId.set(entry.id, entry);
  }

  async saveMany(entries: readonly QueueEntry[]): Promise<void> {
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
    }
  }

  clear(): void {
    this.byId.clear();
  }
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly byKey = new Map<string, Customer>();

  private key(businessId: string, phone: string): string {
    return `${businessId}::${phone}`;
  }

  async findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<Customer | null> {
    return this.byKey.get(this.key(businessId, phone)) ?? null;
  }

  async save(customer: Customer): Promise<void> {
    this.byKey.set(this.key(customer.businessId, customer.phone), customer);
  }

  clear(): void {
    this.byKey.clear();
  }
}

export class InMemoryTokenRepository implements TokenRepository {
  readonly tokens: IssuedToken[] = [];

  async save(token: IssuedToken): Promise<void> {
    this.tokens.push(token);
  }
}

export class AlwaysOpenOperatingHours implements OperatingHoursPort {
  async getWindowsForBranch(_branchId: string): Promise<DayWindow[]> {
    return [];
  }

  async getTimezoneOffsetMinutes(_branchId: string): Promise<number> {
    return 0;
  }
}

export class FixedWindowsOperatingHours implements OperatingHoursPort {
  constructor(
    private readonly windows: DayWindow[],
    private readonly offsetMinutes = 0,
  ) {}

  async getWindowsForBranch(_branchId: string): Promise<DayWindow[]> {
    return this.windows;
  }

  async getTimezoneOffsetMinutes(_branchId: string): Promise<number> {
    return this.offsetMinutes;
  }
}
