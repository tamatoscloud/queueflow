import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTemplate } from '../templates/template-renderer';
import { MockNotificationProvider } from '../providers/mock-notification.provider';
import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import {
  NotificationDispatcher,
  NonRetryableNotificationError,
} from '../services/notification-dispatcher.service';

describe('renderTemplate', () => {
  it('replaces variables', () => {
    expect(
      renderTemplate('Hello {{name}}, position {{position}}', {
        name: 'Ali',
        position: 3,
      }),
    ).toBe('Hello Ali, position 3');
  });

  it('handles missing variables as empty string', () => {
    expect(renderTemplate('Hi {{name}}', {})).toBe('Hi ');
  });
});

describe('MockNotificationProvider', () => {
  it('delivers successfully by default', async () => {
    const provider = new MockNotificationProvider();
    const result = await provider.send({
      notificationId: 'n1',
      businessId: 'b1',
      customerId: 'c1',
      channel: 'SMS',
      type: 'QUEUE_JOINED',
      toPhone: '+923001234567',
      message: { body: 'test' },
    });
    expect(result.status).toBe('DELIVERED');
    expect(result.providerMessageId).toBeTruthy();
  });
});

describe('NotificationProviderRegistry', () => {
  it('uses mock when NOTIFICATION_USE_MOCK is true', () => {
    process.env.NOTIFICATION_USE_MOCK = 'true';
    const mock = { name: 'mock', supports: () => true, send: vi.fn() };
    const registry = new NotificationProviderRegistry([mock as never]);
    expect(registry.resolve('SMS').name).toBe('mock');
    delete process.env.NOTIFICATION_USE_MOCK;
  });
});

describe('NotificationDispatcher', () => {
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
  });

  it('marks cancelled notifications as non-retryable terminal', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: true,
      notificationId: 'n1',
    });
    repository.findById.mockResolvedValue({
      status: 'CANCELLED',
      business: { settings: { notificationsEnabled: true } },
      customer: { phone: '+923001111111' },
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

  it('marks NO_PHONE as non-retryable terminal after recording failure', async () => {
    repository.claimForProcessing.mockResolvedValue({
      claimed: true,
      notificationId: 'n1',
    });
    repository.findById.mockResolvedValue({
      id: 'n1',
      status: 'PROCESSING',
      businessId: 'biz',
      customerId: 'cust',
      type: 'QUEUE_JOINED',
      channel: 'SMS',
      payload: {},
      business: { settings: { notificationsEnabled: true, locale: 'en' } },
      customer: { phone: null },
    });
    const dispatcher = new NotificationDispatcher(
      repository as never,
      templates as never,
      providerRegistry as never,
    );
    await expect(dispatcher.dispatch({ notificationId: 'n1' })).rejects.toBeInstanceOf(
      NonRetryableNotificationError,
    );
    expect(repository.recordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'NO_PHONE' }),
    );
    expect(providerRegistry.resolve).not.toHaveBeenCalled();
  });
});
