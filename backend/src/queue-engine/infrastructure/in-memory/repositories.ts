import type { Queue } from '../../domain/entities/queue.entity';
import type { QueueEntry } from '../../domain/entities/queue-entry.entity';
import type { Customer } from '../../domain/entities/customer.entity';
import { ACTIVE_ENTRY_STATUSES, QueueEntryStatus, type QueueEntryStatus as Status } from '../../domain/enums';
import type { IssuedToken } from '../../domain/factories/token-factory';
import type { DayWindow } from '../../domain/policies/operating-hours-policy';
import { OrderingPolicy } from '../../domain/policies/queue-policies';
import type {
  CustomerRepository,
  IncrementedTokenCounter,
  OperatingHoursPort,
  QueueEntryRepository,
  QueueRepository,
  TokenRepository,
} from '../../application/ports/repositories';

type QueueSnapshot = Map<string, Queue>;
type EntrySnapshot = Map<string, QueueEntry>;
type CustomerSnapshot = Map<string, Customer>;
type TokenSnapshot = IssuedToken[];

export class InMemoryQueueRepository implements QueueRepository {
  private readonly byId = new Map<string, Queue>();

  async findById(id: string): Promise<Queue | null> {
    return this.byId.get(id) ?? null;
  }

  async lockById(id: string): Promise<Queue | null> {
    return this.findById(id);
  }

  async incrementTokenNumber(queueId: string): Promise<IncrementedTokenCounter> {
    const queue = this.byId.get(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }
    const tokenNumber = queue.issueNextTokenNumber(new Date());
    this.byId.set(queueId, queue);
    return { tokenNumber, prefix: queue.prefix };
  }

  async save(queue: Queue): Promise<void> {
    this.byId.set(queue.id, queue);
  }

  snapshot(): QueueSnapshot {
    return new Map(this.byId);
  }

  restore(snapshot: QueueSnapshot): void {
    this.byId.clear();
    for (const [id, queue] of snapshot) {
      this.byId.set(id, queue);
    }
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

  async lockById(id: string): Promise<QueueEntry | null> {
    return this.findById(id);
  }

  async findByQueueId(queueId: string): Promise<QueueEntry[]> {
    return [...this.byId.values()].filter((e) => e.queueId === queueId);
  }

  async findActiveByQueueId(queueId: string): Promise<QueueEntry[]> {
    return (await this.findByQueueId(queueId)).filter((e) =>
      (ACTIVE_ENTRY_STATUSES as readonly Status[]).includes(e.status),
    );
  }

  async findActivePhones(
    queueId: string,
  ): Promise<Array<{ entryId: string; phone: string; status: Status }>> {
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

  async claimNextWaiting(
    queueId: string,
    priorityEnabled: boolean,
    actorUserId: string | null,
    now: Date,
  ): Promise<QueueEntry | null> {
    const active = await this.findActiveByQueueId(queueId);
    const waiting = OrderingPolicy.sortWaiting(active, priorityEnabled);
    const next = waiting[0];
    if (!next) {
      return null;
    }
    next.call(actorUserId, now);
    await this.save(next);
    return next;
  }

  async save(entry: QueueEntry): Promise<void> {
    this.byId.set(entry.id, entry);
  }

  async saveMany(entries: readonly QueueEntry[]): Promise<void> {
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
    }
  }

  snapshot(): EntrySnapshot {
    return new Map(this.byId);
  }

  restore(snapshot: EntrySnapshot): void {
    this.byId.clear();
    for (const [id, entry] of snapshot) {
      this.byId.set(id, entry);
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

  snapshot(): CustomerSnapshot {
    return new Map(this.byKey);
  }

  restore(snapshot: CustomerSnapshot): void {
    this.byKey.clear();
    for (const [key, customer] of snapshot) {
      this.byKey.set(key, customer);
    }
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

  snapshot(): TokenSnapshot {
    return [...this.tokens];
  }

  restore(snapshot: TokenSnapshot): void {
    this.tokens.length = 0;
    this.tokens.push(...snapshot);
  }

  clear(): void {
    this.tokens.length = 0;
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
