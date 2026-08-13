import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationStatus } from '@prisma/client';
import {
  buildBroadcastNotificationKey,
  buildPrimaryNotificationKey,
  buildWaitNotificationKey,
  isRetryableProviderError,
} from '../domain/notification-idempotency';
import { NotificationDispatchService } from '../services/notification-dispatch.service';
import {
  NotificationDispatcher,
  NonRetryableNotificationError,
} from '../services/notification-dispatcher.service';

describe('notification idempotency keys', () => {
  it('builds distinct primary keys per event type', () => {
    const base = {
      businessId: 'biz-1',
      queueEntryId: 'entry-1',
      type: 'QUEUE_JOINED' as const,
    };
    const joined = buildPrimaryNotificationKey({ ...base, eventType: 'CustomerJoined' });
    const called = buildPrimaryNotificationKey({ ...base, eventType: 'CustomerCalled' });
    expect(joined).not.toBe(called);
  });

  it('builds distinct wait keys per position', () => {
    const a = buildWaitNotificationKey({
      queueEntryId: 'e1',
      type: 'POSITION_UPDATE',
      position: 3,
    });
    const b = buildWaitNotificationKey({
      queueEntryId: 'e1',
      type: 'POSITION_UPDATE',
      position: 2,
    });
    expect(a).not.toBe(b);
  });

  it('builds distinct broadcast keys per entry', () => {
    const a = buildBroadcastNotificationKey({
      eventType: 'QueuePaused',
      queueId: 'q1',
      queueEntryId: 'e1',
    });
    const b = buildBroadcastNotificationKey({
      eventType: 'QueuePaused',
      queueId: 'q1',
      queueEntryId: 'e2',
    });
    expect(a).not.toBe(b);
  });

  it('classifies retryable vs permanent provider errors', () => {
    expect(isRetryableProviderError('NETWORK_ERROR')).toBe(true);
    expect(isRetryableProviderError('NO_PHONE')).toBe(false);
    expect(isRetryableProviderError('ERR', 429)).toBe(true);
    expect(isRetryableProviderError('ERR', 400)).toBe(false);
    expect(isRetryableProviderError('ERR', 503)).toBe(true);
  });
});

describe('NotificationDispatchService idempotency', () => {
  const repository = {
    createIdempotent: vi.fn(),
    markQueued: vi.fn(),
    updateStatus: vi.fn(),
    expandChannels: vi.fn(),
  };
  const queue = {
    isEnabled: true,
    enqueueSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.expandChannels.mockReturnValue(['SMS']);
    repository.markQueued.mockResolvedValue(undefined);
    queue.enqueueSend.mockResolvedValue(undefined);
  });

  it('same notification request twice creates one queued job', async () => {
    repository.createIdempotent
      .mockResolvedValueOnce({
        notification: { id: 'n1', status: NotificationStatus.PENDING },
        created: true,
      })
      .mockResolvedValueOnce({
        notification: { id: 'n1', status: NotificationStatus.QUEUED },
        created: false,
      });

    const service = new NotificationDispatchService(repository as never, queue as never);
    const input = {
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED' as const,
      idempotencyKey: 'key-1',
      channel: 'SMS' as const,
    };

    await service.schedule(input);
    await service.schedule(input);

    expect(repository.createIdempotent).toHaveBeenCalledTimes(2);
    expect(queue.enqueueSend).toHaveBeenCalledTimes(1);
  });

  it('different channels produce separate schedules', async () => {
    repository.expandChannels.mockReturnValue(['WHATSAPP', 'SMS']);
    repository.createIdempotent.mockImplementation(async (input) => ({
      notification: { id: `n-${input.channel}`, status: NotificationStatus.PENDING },
      created: true,
    }));

    const service = new NotificationDispatchService(repository as never, queue as never);
    await service.scheduleForPreference({
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      preference: 'BOTH',
      idempotencyKeyBase: 'primary:biz:e1:QUEUE_JOINED:CustomerJoined',
    });

    expect(repository.createIdempotent).toHaveBeenCalledTimes(2);
    expect(queue.enqueueSend).toHaveBeenCalledTimes(2);
  });

  it('concurrent duplicate returns existing without duplicate enqueue when QUEUED', async () => {
    repository.createIdempotent.mockResolvedValue({
      notification: { id: 'n1', status: NotificationStatus.QUEUED },
      created: false,
    });

    const service = new NotificationDispatchService(repository as never, queue as never);
    await Promise.all([
      service.schedule({
        businessId: 'biz',
        customerId: 'cust',
        type: 'QUEUE_JOINED',
        channel: 'SMS',
        idempotencyKey: 'dup-key',
      }),
      service.schedule({
        businessId: 'biz',
        customerId: 'cust',
        type: 'QUEUE_JOINED',
        channel: 'SMS',
        idempotencyKey: 'dup-key',
      }),
    ]);

    expect(queue.enqueueSend).not.toHaveBeenCalled();
  });
});

describe('NotificationDispatcher worker idempotency', () => {
  const repository = {
    claimForProcessing: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    recordDelivery: vi.fn(),
  };
  const templates = { render: vi.fn() };
  const providerRegistry = { resolve: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    templates.render.mockResolvedValue({ body: 'hello' });
  });

  it('skips provider call when notification already terminal', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: false,
      reason: 'terminal',
      notificationId: 'n1',
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await expect(dispatcher.dispatch({ notificationId: 'n1' })).rejects.toBeInstanceOf(
      NonRetryableNotificationError,
    );
    expect(providerRegistry.resolve).not.toHaveBeenCalled();
  });

  it('skips provider call when already SENT after claim miss', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: false,
      reason: 'already_processing',
      notificationId: 'n1',
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await expect(dispatcher.dispatch({ notificationId: 'n1' })).rejects.toThrow(
      'Notification already processing',
    );
    expect(providerRegistry.resolve).not.toHaveBeenCalled();
  });

  it('claims and sends when pending', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: true,
      notificationId: 'n1',
    });
    repository.findById.mockResolvedValue({
      id: 'n1',
      status: NotificationStatus.PROCESSING,
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      channel: 'SMS',
      payload: {},
      business: { settings: { notificationsEnabled: true, locale: 'en' } },
      customer: { phone: '+923001111111' },
    });
    providerRegistry.resolve.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        provider: 'OTHER',
        status: 'DELIVERED',
      }),
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await dispatcher.dispatch({ notificationId: 'n1' });
    expect(providerRegistry.resolve).toHaveBeenCalled();
    expect(repository.recordDelivery).toHaveBeenCalled();
  });

  it('throws retryable error on transient provider failure', async () => {
    repository.claimForProcessing.mockResolvedValue({ claimed: true, notificationId: 'n1' });
    repository.findById.mockResolvedValue({
      id: 'n1',
      status: NotificationStatus.PROCESSING,
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      channel: 'SMS',
      payload: {},
      business: { settings: { notificationsEnabled: true, locale: 'en' } },
      customer: { phone: '+923001111111' },
    });
    providerRegistry.resolve.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        provider: 'OTHER',
        status: 'FAILED',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'timeout',
      }),
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await expect(dispatcher.dispatch({ notificationId: 'n1' })).rejects.toThrow('timeout');
  });

  it('throws non-retryable error on permanent provider failure', async () => {
    repository.claimForProcessing.mockResolvedValue({ claimed: true, notificationId: 'n1' });
    repository.findById.mockResolvedValue({
      id: 'n1',
      status: NotificationStatus.PROCESSING,
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      channel: 'SMS',
      payload: {},
      business: { settings: { notificationsEnabled: true, locale: 'en' } },
      customer: { phone: '+923001111111' },
    });
    providerRegistry.resolve.mockReturnValue({
      send: vi.fn().mockResolvedValue({
        provider: 'OTHER',
        status: 'FAILED',
        errorCode: 'NO_PHONE',
        errorMessage: 'bad recipient',
        responsePayload: { httpStatus: 400 },
      }),
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await expect(dispatcher.dispatch({ notificationId: 'n1' })).rejects.toBeInstanceOf(
      NonRetryableNotificationError,
    );
  });

  it('recovers stale PROCESSING via claim result', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: true,
      notificationId: 'n1',
      reason: 'recovered_stale',
    });
    repository.findById.mockResolvedValue({
      id: 'n1',
      status: NotificationStatus.PROCESSING,
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      channel: 'SMS',
      payload: {},
      business: { settings: { notificationsEnabled: true, locale: 'en' } },
      customer: { phone: '+923001111111' },
    });
    providerRegistry.resolve.mockReturnValue({
      send: vi.fn().mockResolvedValue({ provider: 'OTHER', status: 'SENT' }),
    });

    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await dispatcher.dispatch({ notificationId: 'n1' });
    expect(repository.recordDelivery).toHaveBeenCalled();
  });
});
