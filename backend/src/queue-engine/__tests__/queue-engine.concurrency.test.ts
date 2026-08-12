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
  NotificationPreference,
  QueueEntryStatus,
  QueueCapacityExceededError,
  QueueEmptyError,
  CrossTenantTransferError,
} from '../index';

function createConcurrencyEngine() {
  const clock = new FixedClock(new Date('2026-07-20T10:00:00.000Z'));
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
    operatingHours: new AlwaysOpenOperatingHours(),
    unitOfWork,
  });
  return { engine, eventBus, queues, entries, tokens, customers };
}

async function seedQueue(
  engine: QueueEngineService,
  opts?: { maxCapacity?: number; priorityEnabled?: boolean },
) {
  return engine.createQueue({
    businessId: '00000000-0000-4000-8000-000000000001',
    branchId: '00000000-0000-4000-8000-000000000002',
    name: 'Main',
    prefix: 'A',
    maxCapacity: opts?.maxCapacity,
    priorityEnabled: opts?.priorityEnabled,
  });
}

function joinBody(phone: string) {
  return {
    fullName: 'Guest',
    phone,
    partySize: 1,
    notificationPreference: NotificationPreference.SMS,
  };
}

describe('QueueEngine concurrency (Wave 1C-B)', () => {
  let ctx: ReturnType<typeof createConcurrencyEngine>;

  beforeEach(() => {
    ctx = createConcurrencyEngine();
  });

  it('concurrent joins cannot exceed queue capacity', async () => {
    const queue = await seedQueue(ctx.engine, { maxCapacity: 3 });
    const phones = Array.from({ length: 5 }, (_, i) => `+9230012345${i}0`);

    const results = await Promise.allSettled(
      phones.map((phone) =>
        ctx.engine.joinQueue({
          queueId: queue.id,
          ...joinBody(phone),
          source: 'QR_LANDING' as never,
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(succeeded).toHaveLength(3);
    expect(failed).toHaveLength(2);
    for (const r of failed) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
        QueueCapacityExceededError,
      );
    }
    expect(await ctx.entries.countActive(queue.id)).toBe(3);
  });

  it('concurrent joins produce unique token numbers', async () => {
    const queue = await seedQueue(ctx.engine);
    const phones = Array.from({ length: 20 }, (_, i) => `+9230090000${String(i).padStart(2, '0')}`);

    const results = await Promise.all(
      phones.map((phone) =>
        ctx.engine.joinQueue({
          queueId: queue.id,
          ...joinBody(phone),
          source: 'QR_LANDING' as never,
        }),
      ),
    );

    const tokenNumbers = results.map((r) => r.tokenNumber);
    expect(new Set(tokenNumbers).size).toBe(tokenNumbers.length);
    expect(tokenNumbers.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it('concurrent joins preserve valid queue ordering by sortOrder', async () => {
    const queue = await seedQueue(ctx.engine);
    const phones = Array.from({ length: 10 }, (_, i) => `+9230080000${i}`);

    await Promise.all(
      phones.map((phone) =>
        ctx.engine.joinQueue({
          queueId: queue.id,
          ...joinBody(phone),
          source: 'QR_LANDING' as never,
        }),
      ),
    );

    const active = await ctx.entries.findActiveByQueueId(queue.id);
    const sortOrders = active.map((e) => e.sortOrder);
    const sorted = [...sortOrders].sort((a, b) => a - b);
    expect(sortOrders).toEqual(sorted);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it('failed join transaction leaves no partial entry or token state', async () => {
    const queue = await seedQueue(ctx.engine, { maxCapacity: 1 });
    await ctx.engine.joinQueue({
      queueId: queue.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });

    const entriesBefore = (await ctx.entries.findByQueueId(queue.id)).length;
    const tokensBefore = ctx.tokens.tokens.length;

    await expect(
      ctx.engine.joinQueue({
        queueId: queue.id,
        ...joinBody('+923002222222'),
        source: 'QR_LANDING' as never,
      }),
    ).rejects.toBeInstanceOf(QueueCapacityExceededError);

    expect((await ctx.entries.findByQueueId(queue.id)).length).toBe(entriesBefore);
    expect(ctx.tokens.tokens.length).toBe(tokensBefore);
  });

  it('two simultaneous callNext requests cannot call the same entry', async () => {
    const queue = await seedQueue(ctx.engine);
    for (let i = 0; i < 3; i++) {
      await ctx.engine.joinQueue({
        queueId: queue.id,
        ...joinBody(`+9230070000${i}`),
        source: 'QR_LANDING' as never,
      });
    }

    const [first, second] = await Promise.allSettled([
      ctx.engine.callNextCustomer(queue.id, 'staff-1'),
      ctx.engine.callNextCustomer(queue.id, 'staff-2'),
    ]);

    const fulfilled = [first, second].filter((r) => r.status === 'fulfilled') as Array<
      PromiseFulfilledResult<Awaited<ReturnType<QueueEngineService['callNextCustomer']>>>
    >;
    expect(fulfilled).toHaveLength(2);
    const calledIds = fulfilled.map((r) => r.value.id);
    expect(new Set(calledIds).size).toBe(2);

    const called = await ctx.entries.findActiveByQueueId(queue.id);
    const calledEntries = called.filter((e) => e.status === QueueEntryStatus.CALLED);
    expect(calledEntries).toHaveLength(2);
  });

  it('concurrent callNext on empty queue is safe', async () => {
    const queue = await seedQueue(ctx.engine);

    const results = await Promise.allSettled([
      ctx.engine.callNextCustomer(queue.id),
      ctx.engine.callNextCustomer(queue.id),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(QueueEmptyError);
    }
    expect(ctx.eventBus.published.filter((e) => e.type === 'CustomerCalled')).toHaveLength(0);
  });

  it('transfer across tenants remains rejected under concurrency setup', async () => {
    const q1 = await ctx.engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Q1',
      prefix: 'A',
    });
    const q2 = await ctx.engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000099',
      branchId: '00000000-0000-4000-8000-000000000099',
      name: 'Q2',
      prefix: 'B',
    });
    const joined = await ctx.engine.joinQueue({
      queueId: q1.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });

    await expect(
      ctx.engine.transferCustomer(joined.entryId, q2.id),
    ).rejects.toBeInstanceOf(CrossTenantTransferError);

    const entry = await ctx.entries.findById(joined.entryId);
    expect(entry?.queueId).toBe(q1.id);
  });

  it('failed transfer leaves entry in original valid state', async () => {
    const q1 = await seedQueue(ctx.engine, { maxCapacity: 1 });
    const q2 = await ctx.engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Full',
      prefix: 'B',
      maxCapacity: 1,
    });
    const joined = await ctx.engine.joinQueue({
      queueId: q1.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });
    await ctx.engine.joinQueue({
      queueId: q2.id,
      ...joinBody('+923002222222'),
      source: 'QR_LANDING' as never,
    });

    await expect(
      ctx.engine.transferCustomer(joined.entryId, q2.id),
    ).rejects.toBeInstanceOf(QueueCapacityExceededError);

    const entry = await ctx.entries.findById(joined.entryId);
    expect(entry?.queueId).toBe(q1.id);
    expect(entry?.displayCode).toBe('A-001');
  });

  it('concurrent transfer of the same entry only succeeds once', async () => {
    const q1 = await seedQueue(ctx.engine);
    const q2 = await ctx.engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Target',
      prefix: 'B',
    });
    const joined = await ctx.engine.joinQueue({
      queueId: q1.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });

    const results = await Promise.allSettled([
      ctx.engine.transferCustomer(joined.entryId, q2.id),
      ctx.engine.transferCustomer(joined.entryId, q2.id),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    expect(succeeded).toHaveLength(1);

    const entry = await ctx.entries.findById(joined.entryId);
    expect(entry?.queueId).toBe(q2.id);
    expect(entry?.displayCode).toBe('B-001');
  });

  it('successful mutation emits expected event exactly once', async () => {
    const queue = await seedQueue(ctx.engine);
    ctx.eventBus.clear();

    await ctx.engine.joinQueue({
      queueId: queue.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });

    const joinedEvents = ctx.eventBus.published.filter(
      (e) => e.type === 'CustomerJoined',
    );
    expect(joinedEvents).toHaveLength(1);
  });

  it('rolled-back mutation emits no successful mutation event', async () => {
    const queue = await seedQueue(ctx.engine, { maxCapacity: 1 });
    await ctx.engine.joinQueue({
      queueId: queue.id,
      ...joinBody('+923001111111'),
      source: 'QR_LANDING' as never,
    });
    ctx.eventBus.clear();

    await expect(
      ctx.engine.joinQueue({
        queueId: queue.id,
        ...joinBody('+923002222222'),
        source: 'QR_LANDING' as never,
      }),
    ).rejects.toBeInstanceOf(QueueCapacityExceededError);

    expect(ctx.eventBus.published).toHaveLength(0);
  });
});
