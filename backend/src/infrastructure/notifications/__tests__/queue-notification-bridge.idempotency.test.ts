import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationType } from '@prisma/client';
import { QueueNotificationBridgeService } from '../bridge/queue-notification-bridge.service';
import type { DomainEvent } from '../../../queue-engine';

describe('QueueNotificationBridgeService idempotency', () => {
  const dispatch = {
    scheduleForPreference: vi.fn().mockResolvedValue(['n1']),
    feedbackUrl: vi.fn().mockReturnValue('http://localhost/feedback/e1'),
  };
  const repository = {
    findEntryContext: vi.fn(),
    findWaitingEntriesForQueue: vi.fn(),
  };
  const engine = {
    getLiveQueueSnapshot: vi.fn(),
    estimateWaitTime: vi.fn(),
  };
  const webPush = {
    sendToEntry: vi.fn().mockResolvedValue(undefined),
  };
  const eventBus = {
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };

  let bridge: QueueNotificationBridgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new QueueNotificationBridgeService(
      eventBus as never,
      dispatch as never,
      repository as never,
      engine as never,
      webPush as never,
    );
    repository.findEntryContext.mockResolvedValue({
      id: 'entry-1',
      customerId: 'cust-1',
      customer: { fullName: 'Ali' },
      notificationPreference: 'SMS',
      queueToken: { displayCode: 'A-001' },
      queue: { name: 'Main' },
      business: { name: 'Biz', settings: { notificationsEnabled: true } },
      lastKnownPosition: 1,
    });
  });

  it('schedules primary notification once per event with deterministic idempotency base', async () => {
    const event: DomainEvent = {
      type: 'CustomerJoined',
      aggregateId: 'queue-1',
      businessId: 'biz-1',
      occurredAt: new Date('2026-07-20T10:00:00Z'),
      payload: { entryId: 'entry-1' },
    };

    await bridge.handleDomainEvent(event);
    await bridge.handleDomainEvent(event);

    expect(dispatch.scheduleForPreference).toHaveBeenCalledTimes(2);
    const firstCall = dispatch.scheduleForPreference.mock.calls[0]![0];
    const secondCall = dispatch.scheduleForPreference.mock.calls[1]![0];
    expect(firstCall.idempotencyKeyBase).toBe(secondCall.idempotencyKeyBase);
    expect(firstCall.idempotencyKeyBase).toContain('primary');
    expect(firstCall.idempotencyKeyBase).toContain('CustomerJoined');
  });

  it('uses different idempotency base for different recipients', async () => {
    const event: DomainEvent = {
      type: 'CustomerJoined',
      aggregateId: 'queue-1',
      businessId: 'biz-1',
      occurredAt: new Date('2026-07-20T10:00:00Z'),
      payload: { entryId: 'entry-1' },
    };
    const event2: DomainEvent = {
      ...event,
      payload: { entryId: 'entry-2' },
    };
    repository.findEntryContext.mockImplementation(async (id: string) => ({
      id,
      customerId: id === 'entry-1' ? 'cust-1' : 'cust-2',
      customer: { fullName: 'Guest' },
      notificationPreference: 'SMS',
      queueToken: { displayCode: 'A-002' },
      queue: { name: 'Main' },
      business: { name: 'Biz', settings: { notificationsEnabled: true } },
      lastKnownPosition: 2,
    }));

    await bridge.handleDomainEvent(event);
    await bridge.handleDomainEvent(event2);

    const key1 = dispatch.scheduleForPreference.mock.calls[0]![0].idempotencyKeyBase;
    const key2 = dispatch.scheduleForPreference.mock.calls[1]![0].idempotencyKeyBase;
    expect(key1).not.toBe(key2);
  });

  it('does not schedule when notifications are disabled', async () => {
    repository.findEntryContext.mockResolvedValue({
      id: 'entry-1',
      customerId: 'cust-1',
      customer: { fullName: 'Ali' },
      notificationPreference: 'SMS',
      queueToken: { displayCode: 'A-001' },
      queue: { name: 'Main' },
      business: { name: 'Biz', settings: { notificationsEnabled: false } },
      lastKnownPosition: 1,
    });

    await bridge.handleDomainEvent({
      type: 'CustomerJoined',
      aggregateId: 'queue-1',
      businessId: 'biz-1',
      occurredAt: new Date(),
      payload: { entryId: 'entry-1' },
    });

    expect(dispatch.scheduleForPreference).not.toHaveBeenCalled();
  });

  it('maps CustomerCalled to YOUR_TURN notification type', async () => {
    await bridge.handleDomainEvent({
      type: 'CustomerCalled',
      aggregateId: 'queue-1',
      businessId: 'biz-1',
      occurredAt: new Date(),
      payload: { entryId: 'entry-1', displayCode: 'A-001' },
    });

    expect(dispatch.scheduleForPreference).toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.YOUR_TURN }),
    );
  });
});
