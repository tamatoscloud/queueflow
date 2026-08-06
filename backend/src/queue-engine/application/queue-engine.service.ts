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
import type { CreateQueueInput } from '../domain/entities/queue.entity';
import type { JoinQueueCommand } from '../domain/validators/join-queue-validator';
import type {
  JoinResult,
  LiveQueueEntrySnapshot,
  LiveQueueSnapshot,
} from './commands/types';
import type { QueueMetrics, WaitEstimate } from '../domain/value-objects';

export interface QueueEngineDeps {
  queues: QueueRepository;
  entries: QueueEntryRepository;
  customers: CustomerRepository;
  tokens: TokenRepository;
  eventBus: EventBus;
  clock: Clock;
  operatingHours: OperatingHoursPort;
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
    const queue = await this.requireQueue(command.queueId);
    const now = this.deps.clock.now();

    if (!command.bypassOperatingHours) {
      const windows = await this.deps.operatingHours.getWindowsForBranch(
        queue.branchId,
      );
      const offset = await this.deps.operatingHours.getTimezoneOffsetMinutes(
        queue.branchId,
      );
      OperatingHoursPolicy.assertOpen(queue.branchId, now, windows, offset);
    }

    const activeCount = await this.deps.entries.countActive(queue.id);
    CapacityPolicy.assertCanJoin(queue, activeCount);

    const activePhones = await this.deps.entries.findActivePhones(queue.id);
    DuplicateJoinPolicy.assertPhoneNotActive(validated.phone, activePhones);

    const existingCustomer = await this.deps.customers.findByBusinessAndPhone(
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
    await this.deps.customers.save(customer);

    const { priority, isVip } = PriorityPolicy.resolveJoinPriority({
      priorityEnabled: queue.priorityEnabled,
      isVip: command.isVip ?? false,
      requestedPriority: command.priority,
    });

    const active = await this.deps.entries.findActiveByQueueId(queue.id);
    const sortOrder = OrderingPolicy.nextSortOrder(active);

    const token = TokenFactory.issue(queue, now);
    await this.deps.tokens.save(token);
    await this.deps.queues.save(queue);

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
    WaitTimeCalculator.recalculateAll(queue, allActive, now);

    await this.deps.entries.save(entry);
    await this.deps.entries.saveMany(allActive.filter((e) => e.id !== entry.id));

    await this.deps.eventBus.publish(
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
    );

    return {
      entryId: entry.id,
      customerId: customer.id,
      displayCode: token.displayCode,
      tokenNumber: token.tokenNumber,
      estimate,
    };
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
    const queue = await this.requireQueue(queueId);
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queueId);
    const waiting = OrderingPolicy.sortWaiting(active, queue.priorityEnabled);
    const next = waiting[0];
    if (!next) {
      throw new QueueEmptyError(queueId);
    }
    next.call(actorUserId ?? null, now);
    await this.deps.entries.save(next);
    await this.recalculateWaits(queue);
    await this.deps.eventBus.publish(
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
    );
    return next;
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
    const entry = await this.requireEntry(entryId);
    const sourceQueue = await this.requireQueue(entry.queueId);
    const targetQueue = await this.requireQueue(targetQueueId);
    if (sourceQueue.businessId !== targetQueue.businessId) {
      throw new CrossTenantTransferError();
    }
    if (sourceQueue.id === targetQueue.id) {
      throw new ValidationError('Source and target queue are the same');
    }
    const now = this.deps.clock.now();

    const activeCount = await this.deps.entries.countActive(targetQueue.id);
    CapacityPolicy.assertCanJoin(targetQueue, activeCount);

    const activePhones = await this.deps.entries.findActivePhones(targetQueue.id);
    DuplicateJoinPolicy.assertPhoneNotActive(
      PhoneNumber.create(entry.customerPhone),
      activePhones,
    );

    const targetActive = await this.deps.entries.findActiveByQueueId(
      targetQueue.id,
    );
    const sortOrder = OrderingPolicy.nextSortOrder(targetActive);
    const token = TokenFactory.issue(targetQueue, now);
    await this.deps.tokens.save(token);
    await this.deps.queues.save(targetQueue);

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
    await this.deps.entries.save(entry);
    await this.recalculateWaits(sourceQueue);
    await this.recalculateWaits(targetQueue);
    await this.deps.eventBus.publish(
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
    );
    return entry;
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
        return {
          id: e.id,
          displayCode: e.displayCode,
          status: e.status,
          customerName: e.customerName,
          customerPhone: e.customerPhone,
          partySize: e.partySize,
          position,
          estimatedWaitMinutes: e.estimatedWaitMinutes,
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

  private async recalculateWaits(queue: Queue): Promise<void> {
    const now = this.deps.clock.now();
    const active = await this.deps.entries.findActiveByQueueId(queue.id);
    WaitTimeCalculator.recalculateAll(queue, active, now);
    await this.deps.entries.saveMany(active);
  }
}

// Re-export join command type for consumers
export type { JoinQueueCommand, CreateQueueInput };
export { NotificationPreference, QueueEntrySource };
