import { describe, it, expect, beforeEach } from 'vitest';
import {
  QueueEngineService,
  FixedClock,
  InMemoryEventBus,
  InMemoryQueueRepository,
  InMemoryQueueEntryRepository,
  InMemoryCustomerRepository,
  InMemoryTokenRepository,
  InMemoryUnitOfWork,
  AlwaysOpenOperatingHours,
  FixedWindowsOperatingHours,
  NotificationPreference,
  QueueEntryStatus,
  QueueStatus,
  DuplicateActiveJoinError,
  QueueCapacityExceededError,
  QueueNotAcceptingEntriesError,
  OutsideOperatingHoursError,
  QueueEmptyError,
  RecallTimeoutNotElapsedError,
  NoShowTimeoutNotElapsedError,
  InvalidEntryTransitionError,
  EntryLifecyclePolicy,
  OrderingPolicy,
  VIP_PRIORITY_BUMP,
  CrossTenantTransferError,
} from '../index';

function createEngine(opts?: {
  clock?: FixedClock;
  operatingHours?: AlwaysOpenOperatingHours | FixedWindowsOperatingHours;
}) {
  const clock = opts?.clock ?? new FixedClock(new Date('2026-07-20T10:00:00.000Z'));
  const eventBus = new InMemoryEventBus();
  const queues = new InMemoryQueueRepository();
  const entries = new InMemoryQueueEntryRepository();
  const customers = new InMemoryCustomerRepository();
  const tokens = new InMemoryTokenRepository();
  const unitOfWork = new InMemoryUnitOfWork(queues, entries, customers, tokens);
  const engine = new QueueEngineService({
    queues,
    entries,
    customers,
    tokens,
    eventBus,
    clock,
    operatingHours: opts?.operatingHours ?? new AlwaysOpenOperatingHours(),
    unitOfWork,
  });
  return { engine, clock, eventBus, queues, entries, customers, tokens, unitOfWork };
}

async function seedQueue(
  engine: QueueEngineService,
  overrides?: Partial<{
    maxCapacity: number | null;
    priorityEnabled: boolean;
    averageServiceTimeMinutes: number;
    recallTimeoutSeconds: number;
    noShowTimeoutSeconds: number;
  }>,
) {
  return engine.createQueue({
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Walk-in',
    prefix: 'A',
    maxCapacity: overrides?.maxCapacity ?? null,
    priorityEnabled: overrides?.priorityEnabled ?? false,
    averageServiceTimeMinutes: overrides?.averageServiceTimeMinutes ?? 10,
    recallTimeoutSeconds: overrides?.recallTimeoutSeconds ?? 60,
    noShowTimeoutSeconds: overrides?.noShowTimeoutSeconds ?? 120,
  });
}

describe('EntryLifecyclePolicy', () => {
  it('allows WAITING → CALLED → COMPLETED', () => {
    EntryLifecyclePolicy.assertCanTransition(
      QueueEntryStatus.WAITING,
      QueueEntryStatus.CALLED,
    );
    EntryLifecyclePolicy.assertCanTransition(
      QueueEntryStatus.CALLED,
      QueueEntryStatus.COMPLETED,
    );
  });

  it('rejects COMPLETED → WAITING', () => {
    expect(() =>
      EntryLifecyclePolicy.assertCanTransition(
        QueueEntryStatus.COMPLETED,
        QueueEntryStatus.WAITING,
      ),
    ).toThrow(InvalidEntryTransitionError);
  });
});

describe('QueueEngineService', () => {
  let ctx: ReturnType<typeof createEngine>;

  beforeEach(() => {
    ctx = createEngine();
  });

  it('creates and opens/pauses/resumes/closes a queue', async () => {
    const q = await seedQueue(ctx.engine);
    expect(q.status).toBe(QueueStatus.ACTIVE);

    await ctx.engine.pauseQueue(q.id);
    expect((await ctx.queues.findById(q.id))!.status).toBe(QueueStatus.PAUSED);

    await ctx.engine.resumeQueue(q.id);
    expect((await ctx.queues.findById(q.id))!.status).toBe(QueueStatus.ACTIVE);

    await ctx.engine.closeQueue(q.id);
    const closed = await ctx.queues.findById(q.id);
    expect(closed!.status).toBe(QueueStatus.CLOSED);
    expect(closed!.isAcceptingEntries).toBe(false);

    await ctx.engine.openQueue(q.id);
    expect((await ctx.queues.findById(q.id))!.status).toBe(QueueStatus.ACTIVE);

    const types = ctx.eventBus.published.map((e) => e.type);
    expect(types).toContain('QueueCreated');
    expect(types).toContain('QueuePaused');
    expect(types).toContain('QueueResumed');
    expect(types).toContain('QueueClosed');
    expect(types).toContain('QueueOpened');
  });

  it('joins FIFO and issues tokens A-001, A-002', async () => {
    const q = await seedQueue(ctx.engine);
    const a = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 2,
      notificationPreference: NotificationPreference.SMS,
    });
    const b = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Sara',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.WHATSAPP,
    });
    expect(a.displayCode).toBe('A-001');
    expect(b.displayCode).toBe('A-002');
    expect(a.estimate.position).toBe(1);
    expect(b.estimate.position).toBe(2);
    expect(a.estimate.estimatedWaitMinutes).toBe(2.5);
    expect(b.estimate.estimatedWaitMinutes).toBe(5);
    expect(ctx.eventBus.published.some((e) => e.type === 'CustomerJoined')).toBe(
      true,
    );
  });

  it('prevents duplicate phone in active queue', async () => {
    const q = await seedQueue(ctx.engine);
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await expect(
      ctx.engine.joinQueue({
        queueId: q.id,
        fullName: 'Ali Again',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      }),
    ).rejects.toBeInstanceOf(DuplicateActiveJoinError);
  });

  it('prevents overflow when at capacity', async () => {
    const q = await seedQueue(ctx.engine, { maxCapacity: 1 });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await expect(
      ctx.engine.joinQueue({
        queueId: q.id,
        fullName: 'Sara',
        phone: '+923002222222',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      }),
    ).rejects.toBeInstanceOf(QueueCapacityExceededError);
  });

  it('rejects join when queue is paused', async () => {
    const q = await seedQueue(ctx.engine);
    await ctx.engine.pauseQueue(q.id);
    await expect(
      ctx.engine.joinQueue({
        queueId: q.id,
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      }),
    ).rejects.toBeInstanceOf(QueueNotAcceptingEntriesError);
  });

  it('enforces operating hours', async () => {
    // Monday 10:00 UTC, window only 09:00–10:00 local (= UTC here) → closed at 10:00
    const hours = new FixedWindowsOperatingHours([
      { dayOfWeek: 0, openMinutes: 9 * 60, closeMinutes: 10 * 60, isClosed: false },
    ]);
    const local = createEngine({
      clock: new FixedClock(new Date('2026-07-20T10:00:00.000Z')), // Monday
      operatingHours: hours,
    });
    const q = await seedQueue(local.engine);
    await expect(
      local.engine.joinQueue({
        queueId: q.id,
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      }),
    ).rejects.toBeInstanceOf(OutsideOperatingHoursError);
  });

  it('call next → complete happy path and publishes events', async () => {
    const q = await seedQueue(ctx.engine);
    const joined = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.BOTH,
    });
    const called = await ctx.engine.callNextCustomer(q.id, 'staff-1');
    expect(called.id).toBe(joined.entryId);
    expect(called.status).toBe(QueueEntryStatus.CALLED);

    const done = await ctx.engine.completeCustomer(called.id, 'staff-1');
    expect(done.status).toBe(QueueEntryStatus.COMPLETED);
    expect(done.actualWaitMinutes).not.toBeNull();

    const types = ctx.eventBus.published.map((e) => e.type);
    expect(types).toContain('CustomerCalled');
    expect(types).toContain('CustomerCompleted');
  });

  it('hold → resume held returns to WAITING', async () => {
    const q = await seedQueue(ctx.engine);
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const called = await ctx.engine.callNextCustomer(q.id);
    await ctx.engine.holdCustomer(called.id);
    expect((await ctx.entries.findById(called.id))!.status).toBe(
      QueueEntryStatus.HOLDING,
    );
    await ctx.engine.resumeHeldCustomer(called.id);
    expect((await ctx.entries.findById(called.id))!.status).toBe(
      QueueEntryStatus.WAITING,
    );
  });

  it('skip sends customer to end of waiting line', async () => {
    const q = await seedQueue(ctx.engine);
    const a = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const b = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'B',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.callNextCustomer(q.id);
    await ctx.engine.skipCustomer(a.entryId);
    const snap = await ctx.engine.getLiveQueueSnapshot(q.id);
    const waiting = snap.entries.filter((e) => e.status === QueueEntryStatus.WAITING);
    expect(waiting[0]!.id).toBe(b.entryId);
    expect(waiting[1]!.id).toBe(a.entryId);
  });

  it('cancel removes from active set', async () => {
    const q = await seedQueue(ctx.engine);
    const a = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.cancelQueueEntry(a.entryId);
    expect((await ctx.entries.findById(a.entryId))!.status).toBe(
      QueueEntryStatus.CANCELLED,
    );
    await expect(ctx.engine.callNextCustomer(q.id)).rejects.toBeInstanceOf(
      QueueEmptyError,
    );
  });

  it('recall respects timeout then succeeds', async () => {
    const q = await seedQueue(ctx.engine, { recallTimeoutSeconds: 60 });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const called = await ctx.engine.callNextCustomer(q.id);
    await expect(ctx.engine.recallCustomer(called.id)).rejects.toBeInstanceOf(
      RecallTimeoutNotElapsedError,
    );
    ctx.clock.advanceMs(61_000);
    const recalled = await ctx.engine.recallCustomer(called.id);
    expect(recalled.recalledAt).not.toBeNull();
    expect(ctx.eventBus.published.some((e) => e.type === 'CustomerRecalled')).toBe(
      true,
    );
  });

  it('markNoShow respects timeout; processAutomaticNoShows forces after elapsed', async () => {
    const q = await seedQueue(ctx.engine, { noShowTimeoutSeconds: 120 });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const called = await ctx.engine.callNextCustomer(q.id);
    await expect(ctx.engine.markNoShow(called.id)).rejects.toBeInstanceOf(
      NoShowTimeoutNotElapsedError,
    );
    ctx.clock.advanceMs(121_000);
    const n = await ctx.engine.processAutomaticNoShows(q.id);
    expect(n).toBe(1);
    expect((await ctx.entries.findById(called.id))!.status).toBe(
      QueueEntryStatus.NO_SHOW,
    );
  });

  it('VIP / priority ordering when priorityEnabled', async () => {
    const q = await seedQueue(ctx.engine, { priorityEnabled: true });
    const normal = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'Normal',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const vip = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'VIP',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
      isVip: true,
    });
    expect((await ctx.entries.findById(vip.entryId))!.priority).toBe(
      VIP_PRIORITY_BUMP,
    );
    const next = await ctx.engine.callNextCustomer(q.id);
    expect(next.id).toBe(vip.entryId);
    expect(next.id).not.toBe(normal.entryId);
  });

  it('priorityCustomer elevates an existing entry', async () => {
    const q = await seedQueue(ctx.engine, { priorityEnabled: true });
    const a = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'B',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.priorityCustomer(a.entryId, { priority: 50, isVip: true });
    const next = await ctx.engine.callNextCustomer(q.id);
    expect(next.id).toBe(a.entryId);
  });

  it('reorderQueue changes call order', async () => {
    const q = await seedQueue(ctx.engine);
    const a = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const b = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'B',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.reorderQueue(q.id, [b.entryId, a.entryId]);
    const next = await ctx.engine.callNextCustomer(q.id);
    expect(next.id).toBe(b.entryId);
  });

  it('walkInCustomer uses WALK_IN source', async () => {
    const q = await seedQueue(ctx.engine);
    const result = await ctx.engine.walkInCustomer({
      queueId: q.id,
      fullName: 'Walk',
      phone: '+923003333333',
      partySize: 3,
      notificationPreference: NotificationPreference.SMS,
    });
    const entry = await ctx.entries.findById(result.entryId);
    expect(entry!.source).toBe('WALK_IN');
  });

  it('transferCustomer moves entry to another queue with new token', async () => {
    const q1 = await seedQueue(ctx.engine);
    const q2 = await ctx.engine.createQueue({
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Takeaway',
      prefix: 'T',
    });
    const joined = await ctx.engine.joinQueue({
      queueId: q1.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const transferred = await ctx.engine.transferCustomer(joined.entryId, q2.id);
    expect(transferred.queueId).toBe(q2.id);
    expect(transferred.displayCode.startsWith('T-')).toBe(true);
    expect(transferred.status).toBe(QueueEntryStatus.WAITING);
    expect(
      ctx.eventBus.published.some((e) => e.type === 'CustomerTransferred'),
    ).toBe(true);
  });

  it('getLiveQueueSnapshot and metrics reflect state', async () => {
    const q = await seedQueue(ctx.engine, { averageServiceTimeMinutes: 5 });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'B',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const snap = await ctx.engine.getLiveQueueSnapshot(q.id);
    expect(snap.metrics.waitingCount).toBe(2);
    expect(snap.entries).toHaveLength(2);
    expect(snap.entries[0]!.estimatedWaitMinutes).toBe(2.5);
    expect(snap.entries[1]!.estimatedWaitMinutes).toBe(5);

    const metrics = await ctx.engine.calculateQueueMetrics(q.id);
    expect(metrics.occupancy).toBe(2);
  });

  it('estimateWaitTime matches calculator', async () => {
    const q = await seedQueue(ctx.engine, { averageServiceTimeMinutes: 8 });
    await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'A',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const b = await ctx.engine.joinQueue({
      queueId: q.id,
      fullName: 'B',
      phone: '+923002222222',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const est = await ctx.engine.estimateWaitTime(b.entryId);
    expect(est.customersAhead).toBe(1);
    expect(est.estimatedWaitMinutes).toBe(5);
    expect(est.averageServiceTimeMinutes).toBe(2.5);
  });
});

describe('OrderingPolicy / WaitTimeCalculator pure units', () => {
  it('nextSortOrder increments', () => {
    expect(OrderingPolicy.nextSortOrder([])).toBe(1);
  });
});
