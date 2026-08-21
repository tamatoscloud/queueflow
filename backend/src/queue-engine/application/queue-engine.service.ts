import { Queue } from '../domain/entities/queue.entity';
import { QueueEntry } from '../domain/entities/queue-entry.entity';
import { Customer } from '../domain/entities/customer.entity';
import {
  NotificationPreference,
  QueueEntrySource,
  QueueEntryStatus,
} from '../domain/enums';
import { QueueEvents } from '../domain/events/queue-events';
import { TokenFactory } from '../domain/factories/token-factory';
import { DuplicateJoinPolicy } from '../domain/policies/duplicate-join-policy';
import { OperatingHoursPolicy } from '../domain/policies/operating-hours-policy';
import {
  CapacityPolicy,
  OrderingPolicy,
  PriorityPolicy,
} from '../domain/policies/queue-policies';
import { TimeoutPolicy } from '../domain/policies/timeout-policy';
import {
  MetricsCalculator,
  WaitTimeCalculator,
} from '../domain/services/calculators';
import { clampEstimatedWaitMinutes } from '../domain/services/wait-estimate-bounds';
import { JoinQueueValidator } from '../domain/validators/join-queue-validator';
import { SortOrder, PhoneNumber } from '../domain/value-objects';
import {
  CrossTenantTransferError,
  QueueEmptyError,
  QueueEntryNotFoundError,
  QueueNotFoundError,
  ValidationError,
} from '../domain/exceptions/domain-errors';
import type { Clock } from './ports/clock';
import type { EventBus } from './ports/event-bus';
import type {
  CustomerRepository,
  OperatingHoursPort,
  QueueEntryRepository,
  QueueRepository,
  TokenRepository,
} from './ports/repositories';
import type { TransactionRepositories, UnitOfWork } from './ports/unit-of-work';
import type { CreateQueueInput } from '../domain/entities/queue.entity';
import type { JoinQueueCommand } from '../domain/validators/join-queue-validator';
import type {
  JoinResult,
  LiveQueueEntrySnapshot,
  LiveQueueSnapshot,
} from './commands/types';
import type { QueueMetrics, WaitEstimate } from '../domain/value-objects';
import type { DomainEvent } from '../domain/events/queue-events';

export interface QueueEngineDeps {
  queues: QueueRepository;
  entries: QueueEntryRepository;
  customers: CustomerRepository;
  tokens: TokenRepository;
  eventBus: EventBus;
  clock: Clock;
  operatingHours: OperatingHoursPort;
  unitOfWork: UnitOfWork;
}

/**
 * Application service — the single façade for queue operations.
 * Orchestrates domain entities/policies; has no HTTP/Prisma knowledge.
 */
export class QueueEngineService {
  constructor(private readonly deps: QueueEngineDeps) {}

  // ---------------------------------------------------------------------------
  // Queue lifecycle
  // ---------------------------------------------------------------------------

  async createQueue(input: CreateQueueInput): Promise<Queue> {
    const now = this.deps.clock.now();
    const queue = Queue.create(input, now);
    await this.deps.queues.save(queue);
    await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    return queue;
  }

  async openQueue(queueId: string): Promise<Queue> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    queue.open(now);
    await this.deps.queues.save(queue);
    await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    return queue;
  }

  async pauseQueue(queueId: string): Promise<Queue> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    queue.pause(now);
    await this.deps.queues.save(queue);
    await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    return queue;
  }

  async resumeQueue(queueId: string): Promise<Queue> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    queue.resume(now);
    await this.deps.queues.save(queue);
    await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    return queue;
  }

  async closeQueue(queueId: string): Promise<Queue> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    queue.close(now);
    await this.deps.queues.save(queue);
    await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    return queue;
  }

  // ---------------------------------------------------------------------------
  // Join / cancel / walk-in
  // ---------------------------------------------------------------------------

  async joinQueue(command: JoinQueueCommand): Promise<JoinResult> {
    const validated = JoinQueueValidator.validate(command);
    const now = this.deps.clock.now();

    const queuePreview = await this.requireQueue(command.queueId);
    if (!command.bypassOperatingHours) {
      const windows = await this.deps.operatingHours.getWindowsForBranch(
        queuePreview.branchId,
      );
      const offset = await this.deps.operatingHours.getTimezoneOffsetMinutes(
        queuePreview.branchId,
      );
      OperatingHoursPolicy.assertOpen(queuePreview.branchId, now, windows, offset);
    }

    return this.commitMutation([command.queueId], async (repos) => {
      const queue = await repos.queues.findById(command.queueId);
      if (!queue) {
        throw new QueueNotFoundError(command.queueId);
      }

      const activeCount = await repos.entries.countActive(queue.id);
      CapacityPolicy.assertCanJoin(queue, activeCount);

      const activePhones = await repos.entries.findActivePhones(queue.id);
      DuplicateJoinPolicy.assertPhoneNotActive(validated.phone, activePhones);

      const existingCustomer = await repos.customers.findByBusinessAndPhone(
        queue.businessId,
        validated.phone.value,
      );
      const customer =
        existingCustomer ??
        Customer.create(
          {
            businessId: queue.businessId,
            fullName: validated.fullName,
            phone: validated.phone.value,
            notes: command.notes,
          },
          now,
        );
      customer.recordVisit(now);
      if (customer.isBlacklisted) {
        throw new ValidationError('Customer is blacklisted and cannot join');
      }
      await repos.customers.save(customer);

      const { priority, isVip } = PriorityPolicy.resolveJoinPriority({
        priorityEnabled: queue.priorityEnabled,
        isVip: command.isVip ?? false,
        requestedPriority: command.priority,
      });

      const active = await repos.entries.findActiveByQueueId(queue.id);
      const sortOrder = OrderingPolicy.nextSortOrder(active);

      const counter = await repos.queues.incrementTokenNumber(queue.id);
      const token = TokenFactory.issueWithNumber(
        queue.id,
        counter.prefix,
        counter.tokenNumber,
        now,
      );
      await repos.tokens.save(token);

      const entry = QueueEntry.create(
        {
          businessId: queue.businessId,
          branchId: queue.branchId,
          queueId: queue.id,
          customerId: customer.id,
          queueTokenId: token.id,
          displayCode: token.displayCode,
          tokenNumber: token.tokenNumber,
          source: validated.source,
          partySize: validated.partySize.value,
          notes: command.notes,
          notificationPreference: validated.preference,
          priority,
          isVip,
          sortOrder,
          customerPhone: customer.phone,
          customerName: customer.fullName,
        },
        now,
      );

      const allActive = [...active, entry];
      const estimate = WaitTimeCalculator.estimateForEntry(queue, entry, allActive);
      entry.updateEstimate(estimate.position, estimate.estimatedWaitMinutes, now);

      // Persist only the new entry. Sibling ETA/position rows used to be
      // rewritten via saveMany (findUnique+update per waiter) inside this
      // interactive transaction — that caused ~20s timeouts under production
      // DB latency. Positions and ETAs are derived on read instead.
      await repos.entries.save(entry);

      return {
        value: {
          entryId: entry.id,
          customerId: customer.id,
          displayCode: token.displayCode,
          tokenNumber: token.tokenNumber,
          estimate,
        },
        events: [
          QueueEvents.customerJoined(
            queue.id,
            queue.businessId,
            {
              entryId: entry.id,
              customerId: customer.id,
              displayCode: token.displayCode,
              position: estimate.position,
              source: validated.source,
            },
            now,
          ),
        ],
      };
    });
  }

  async walkInCustomer(
    command: Omit<JoinQueueCommand, 'source'> & { actorUserId?: string | null },
  ): Promise<JoinResult> {
    return this.joinQueue({
      ...command,
      source: QueueEntrySource.WALK_IN,
      bypassOperatingHours: command.bypassOperatingHours ?? true,
    });
  }

  async cancelQueueEntry(
    entryId: string,
    _actorUserId?: string | null,
  ): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    entry.cancel(now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerCancelled(
        queue.id,
        queue.businessId,
        { entryId: entry.id },
        now,
      ),
    );
    return entry;
  }

  // ---------------------------------------------------------------------------
  // Staff operations
  // ---------------------------------------------------------------------------

  async callNextCustomer(
    queueId: string,
    actorUserId?: string | null,
  ): Promise<QueueEntry> {
    const now = this.deps.clock.now();

    return this.commitMutation([queueId], async (repos) => {
      const queue = await repos.queues.findById(queueId);
      if (!queue) {
        throw new QueueNotFoundError(queueId);
      }

      const next = await repos.entries.claimNextWaiting(
        queueId,
        queue.priorityEnabled,
        actorUserId ?? null,
        now,
      );
      if (!next) {
        throw new QueueEmptyError(queueId);
      }

      await this.recalculateWaits(queue, repos);

      return {
        value: next,
        events: [
          QueueEvents.customerCalled(
            queue.id,
            queue.businessId,
            {
              entryId: next.id,
              displayCode: next.displayCode,
              calledByUserId: actorUserId ?? null,
            },
            now,
          ),
        ],
      };
    });
  }

  async recallCustomer(entryId: string): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    if (entry.status !== QueueEntryStatus.CALLED) {
      throw new ValidationError('Only a CALLED customer can be recalled');
    }
    TimeoutPolicy.assertRecallAllowed(queue, entry, now);
    entry.recall(now);
    await this.deps.entries.save(entry);
    await this.deps.eventBus.publish(
      QueueEvents.customerRecalled(
        queue.id,
        queue.businessId,
        { entryId: entry.id, displayCode: entry.displayCode },
        now,
      ),
    );
    return entry;
  }

  async holdCustomer(entryId: string): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    entry.hold(now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerHeld(
        queue.id,
        queue.businessId,
        { entryId: entry.id },
        now,
      ),
    );
    return entry;
  }

  async resumeHeldCustomer(entryId: string): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    entry.resumeFromHold(now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.updated(
        queue.id,
        queue.businessId,
        { entryId: entry.id, action: 'resumeHeld' },
        now,
      ),
    );
    return entry;
  }

  async skipCustomer(entryId: string): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queue.id);
    const newSort = OrderingPolicy.nextSortOrder(
      active.filter((e) => e.id !== entry.id),
    );
    entry.skipToEnd(newSort, now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerSkipped(
        queue.id,
        queue.businessId,
        { entryId: entry.id, newSortOrder: newSort },
        now,
      ),
    );
    return entry;
  }

  async completeCustomer(
    entryId: string,
    actorUserId?: string | null,
  ): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    entry.complete(actorUserId ?? null, now);
    if (entry.actualWaitMinutes !== null) {
      // Use service duration approximation: from calledAt→served when available
      const serviceMinutes =
        entry.calledAt !== null
          ? Math.max(
              1,
              Math.round(
                (now.getTime() - entry.calledAt.getTime()) / 60_000,
              ),
            )
          : entry.actualWaitMinutes;
      queue.recordServiceSample(serviceMinutes, now);
      await this.deps.queues.save(queue);
      await this.deps.eventBus.publishAll(queue.pullDomainEvents());
    }
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerCompleted(
        queue.id,
        queue.businessId,
        {
          entryId: entry.id,
          actualWaitMinutes: entry.actualWaitMinutes,
          servedByUserId: actorUserId ?? null,
        },
        now,
      ),
    );
    return entry;
  }

  async markNoShow(
    entryId: string,
    opts?: { force?: boolean },
  ): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    if (!opts?.force) {
      TimeoutPolicy.assertNoShowAllowed(queue, entry, now);
    }
    entry.markNoShow(now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerNoShow(
        queue.id,
        queue.businessId,
        { entryId: entry.id, automatic: !opts?.force },
        now,
      ),
    );
    return entry;
  }

  /**
   * Scheduler hook: mark CALLED entries past noShowTimeoutSeconds.
   * Returns how many were marked.
   */
  async processAutomaticNoShows(queueId: string): Promise<number> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queueId);
    let count = 0;
    for (const entry of active) {
      if (
        entry.status === QueueEntryStatus.CALLED &&
        TimeoutPolicy.isAutomaticNoShowDue(queue, entry, now)
      ) {
        await this.markNoShow(entry.id, { force: true });
        count += 1;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Move / priority / reorder / transfer
  // ---------------------------------------------------------------------------

  async moveCustomer(
    entryId: string,
    opts: { beforeEntryId?: string | null; afterEntryId?: string | null },
  ): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queue.id);
    const before = opts.beforeEntryId
      ? active.find((e) => e.id === opts.beforeEntryId)
      : null;
    const after = opts.afterEntryId
      ? active.find((e) => e.id === opts.afterEntryId)
      : null;
    const sort = SortOrder.between(
      before?.sortOrder ?? null,
      after?.sortOrder ?? null,
    );
    entry.moveTo(sort.value, now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.customerMoved(
        queue.id,
        queue.businessId,
        {
          entryId: entry.id,
          sortOrder: sort.value,
          beforeEntryId: opts.beforeEntryId ?? null,
          afterEntryId: opts.afterEntryId ?? null,
        },
        now,
      ),
    );
    return entry;
  }

  async priorityCustomer(
    entryId: string,
    opts: { priority: number; isVip?: boolean },
  ): Promise<QueueEntry> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const now = this.deps.clock.now();
    entry.setPriority(opts.priority, opts.isVip ?? entry.isVip, now);
    await this.deps.entries.save(entry);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.updated(
        queue.id,
        queue.businessId,
        {
          entryId: entry.id,
          action: 'priority',
          priority: opts.priority,
          isVip: opts.isVip ?? entry.isVip,
        },
        now,
      ),
    );
    return entry;
  }

  async reorderQueue(
    queueId: string,
    orderedEntryIds: string[],
  ): Promise<QueueEntry[]> {
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queueId);
    const byId = new Map(active.map((e) => [e.id, e]));
    const updated: QueueEntry[] = [];
    orderedEntryIds.forEach((id, index) => {
      const entry = byId.get(id);
      if (!entry) {
        throw new QueueEntryNotFoundError(id);
      }
      entry.moveTo(index + 1, now);
      updated.push(entry);
    });
    await this.deps.entries.saveMany(updated);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
      QueueEvents.updated(
        queue.id,
        queue.businessId,
        { action: 'reorder', orderedEntryIds },
        now,
      ),
    );
    return updated;
  }

  async transferCustomer(
    entryId: string,
    targetQueueId: string,
  ): Promise<QueueEntry> {
    const entryPreview = await this.requireEntry(entryId);
    const sourceQueuePreview = await this.requireQueue(entryPreview.queueId);
    const targetQueuePreview = await this.requireQueue(targetQueueId);
    if (sourceQueuePreview.businessId !== targetQueuePreview.businessId) {
      throw new CrossTenantTransferError();
    }
    if (sourceQueuePreview.id === targetQueuePreview.id) {
      throw new ValidationError('Source and target queue are the same');
    }

    const now = this.deps.clock.now();
    const queueIds = [sourceQueuePreview.id, targetQueuePreview.id].sort();

    return this.commitMutation(queueIds, async (repos) => {
      const entry = await repos.entries.lockById(entryId);
      if (!entry) {
        throw new QueueEntryNotFoundError(entryId);
      }
      const sourceQueue = await repos.queues.findById(entry.queueId);
      const targetQueue = await repos.queues.findById(targetQueueId);
      if (!sourceQueue || !targetQueue) {
        throw new QueueNotFoundError(targetQueueId);
      }
      if (sourceQueue.businessId !== targetQueue.businessId) {
        throw new CrossTenantTransferError();
      }

      const activeCount = await repos.entries.countActive(targetQueue.id);
      CapacityPolicy.assertCanJoin(targetQueue, activeCount);

      const activePhones = await repos.entries.findActivePhones(targetQueue.id);
      DuplicateJoinPolicy.assertPhoneNotActive(
        PhoneNumber.create(entry.customerPhone),
        activePhones,
      );

      const targetActive = await repos.entries.findActiveByQueueId(targetQueue.id);
      const sortOrder = OrderingPolicy.nextSortOrder(targetActive);
      const counter = await repos.queues.incrementTokenNumber(targetQueue.id);
      const token = TokenFactory.issueWithNumber(
        targetQueue.id,
        counter.prefix,
        counter.tokenNumber,
        now,
      );
      await repos.tokens.save(token);

      const fromQueueId = entry.queueId;
      entry.rebindToQueue({
        queueId: targetQueue.id,
        branchId: targetQueue.branchId,
        queueTokenId: token.id,
        displayCode: token.displayCode,
        tokenNumber: token.tokenNumber,
        sortOrder,
        now,
      });
      await repos.entries.save(entry);
      await this.recalculateWaits(sourceQueue, repos);
      await this.recalculateWaits(targetQueue, repos);

      return {
        value: entry,
        events: [
          QueueEvents.customerTransferred(
            targetQueue.id,
            targetQueue.businessId,
            {
              entryId: entry.id,
              fromQueueId,
              toQueueId: targetQueue.id,
              displayCode: token.displayCode,
            },
            now,
          ),
        ],
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async estimateWaitTime(entryId: string): Promise<WaitEstimate> {
    const entry = await this.requireEntry(entryId);
    const queue = await this.requireQueue(entry.queueId);
    const active = await this.deps.entries.findActiveByQueueId(queue.id);
    return WaitTimeCalculator.estimateForEntry(queue, entry, active);
  }

  async calculateQueueMetrics(queueId: string): Promise<QueueMetrics> {
    const queue = await this.requireQueue(queueId);
    const entries = await this.deps.entries.findByQueueId(queueId);
    return MetricsCalculator.calculate(queue, entries);
  }

  async getLiveQueueSnapshot(queueId: string): Promise<LiveQueueSnapshot> {
    const queue = await this.requireQueue(queueId);
    const entries = await this.deps.entries.findByQueueId(queueId);
    const metrics = MetricsCalculator.calculate(queue, entries);
    const active = entries.filter((e) =>
      [
        QueueEntryStatus.WAITING,
        QueueEntryStatus.CALLED,
        QueueEntryStatus.HOLDING,
        QueueEntryStatus.SKIPPED,
      ].includes(e.status),
    );
    const waitingOrdered = OrderingPolicy.sortWaiting(
      active,
      queue.priorityEnabled,
    );
    const positionById = new Map<string, number>(
      waitingOrdered.map((e: QueueEntry, i: number) => [e.id, i + 1]),
    );

    const snapshotEntries: LiveQueueEntrySnapshot[] = active
      .slice()
      .sort((a, b) =>
        OrderingPolicy.compare(a, b, queue.priorityEnabled),
      )
      .map((e) => {
        const position = positionById.get(e.id) ?? e.lastKnownPosition ?? null;
        const customersAhead =
          position != null && e.status === QueueEntryStatus.WAITING
            ? Math.max(0, position - 1)
            : 0;
        const estimatedWaitMinutes =
          e.status === QueueEntryStatus.WAITING
            ? clampEstimatedWaitMinutes(
                customersAhead * queue.averageServiceTimeMinutes,
              )
            : e.estimatedWaitMinutes;
        return {
          id: e.id,
          displayCode: e.displayCode,
          status: e.status,
          customerName: e.customerName,
          customerPhone: e.customerPhone,
          partySize: e.partySize,
          position,
          estimatedWaitMinutes,
          priority: e.priority,
          isVip: e.isVip,
          sortOrder: e.sortOrder,
          source: e.source,
          joinedAt: e.joinedAt,
          calledAt: e.calledAt,
        };
      });

    return {
      queueId: queue.id,
      businessId: queue.businessId,
      branchId: queue.branchId,
      name: queue.name,
      status: queue.status,
      isAcceptingEntries: queue.isAcceptingEntries,
      priorityEnabled: queue.priorityEnabled,
      averageServiceTimeMinutes: queue.averageServiceTimeMinutes,
      maxCapacity: queue.maxCapacity,
      metrics,
      entries: snapshotEntries,
      generatedAt: this.deps.clock.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async requireQueue(queueId: string): Promise<Queue> {
    const queue = await this.deps.queues.findById(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }
    return queue;
  }

  private async requireEntry(entryId: string): Promise<QueueEntry> {
    const entry = await this.deps.entries.findById(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }
    return entry;
  }

  private async recalculateWaits(
    _queue: Queue,
    _repos: TransactionRepositories = {
      queues: this.deps.queues,
      entries: this.deps.entries,
      customers: this.deps.customers,
      tokens: this.deps.tokens,
    },
  ): Promise<void> {
    // Intentionally a no-op for persistence.
    // Waiting positions/ETAs are derived on read (getLiveQueueSnapshot /
    // estimateWaitTime). Rewriting every active row inside interactive
    // transactions caused production join/call timeouts (~20s) under
    // Supabase round-trip latency.
  }

  private async commitMutation<T>(
    queueIds: readonly string[],
    work: (
      repos: TransactionRepositories,
    ) => Promise<{ value: T; events: DomainEvent[] }>,
  ): Promise<T> {
    const { value, events } = await this.deps.unitOfWork.runForQueues(
      queueIds,
      work,
    );
    for (const event of events) {
      await this.deps.eventBus.publish(event);
    }
    return value;
  }
}

// Re-export join command type for consumers
export type { JoinQueueCommand, CreateQueueInput };
export { NotificationPreference, QueueEntrySource };
