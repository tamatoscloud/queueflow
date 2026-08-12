import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { QueueRealtimeGateway } from '../gateway/queue-realtime.gateway';
import type { SocketAuthService } from '../services/socket-auth.service';
import type { RealtimeSubscriptionAuthorizer } from '../services/realtime-subscription-authorizer.service';
import type { QueueRealtimeEmitterService } from '../services/queue-realtime-emitter.service';

const ENTRY_A = '00000000-0000-4000-8000-000000000030';
const QUEUE_A = '00000000-0000-4000-8000-000000000010';

function createSocket() {
  return {
    id: 'socket-1',
    data: { isStaff: false },
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
}

describe('QueueRealtimeGateway subscriptions', () => {
  let gateway: QueueRealtimeGateway;
  let subscriptionAuth: {
    authorizeEntrySubscription: ReturnType<typeof vi.fn>;
    authorizeQueueSubscription: ReturnType<typeof vi.fn>;
    authorizeQueueDisplaySubscription: ReturnType<typeof vi.fn>;
    validateStaffSession: ReturnType<typeof vi.fn>;
  };
  let socketAuth: {
    authenticateHandshake: ReturnType<typeof vi.fn>;
    assertBusinessAccess: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    subscriptionAuth = {
      authorizeEntrySubscription: vi.fn(),
      authorizeQueueSubscription: vi.fn(),
      authorizeQueueDisplaySubscription: vi.fn(),
      validateStaffSession: vi.fn(),
    };
    socketAuth = {
      authenticateHandshake: vi.fn().mockResolvedValue({ isStaff: false }),
      assertBusinessAccess: vi.fn(),
    };
    gateway = new QueueRealtimeGateway(
      socketAuth as unknown as SocketAuthService,
      subscriptionAuth as unknown as RealtimeSubscriptionAuthorizer,
      { bindServer: vi.fn() } as unknown as QueueRealtimeEmitterService,
    );
  });

  it('subscribe:entry joins room only after authorization succeeds', async () => {
    const socket = createSocket();
    subscriptionAuth.authorizeEntrySubscription.mockResolvedValue({
      id: ENTRY_A,
      businessId: 'biz-a',
      queueId: QUEUE_A,
    });

    const result = await gateway.subscribeEntry(socket as never, {
      entryId: ENTRY_A,
      trackingToken: 'valid-token',
    });

    expect(result).toEqual({ ok: true, room: `entry:${ENTRY_A}` });
    expect(subscriptionAuth.authorizeEntrySubscription).toHaveBeenCalledWith(
      socket,
      ENTRY_A,
      'valid-token',
    );
    expect(socket.join).toHaveBeenCalledWith(`entry:${ENTRY_A}`);
  });

  it('subscribe:entry does not join room when authorization fails', async () => {
    const socket = createSocket();
    subscriptionAuth.authorizeEntrySubscription.mockRejectedValue(
      new UnauthorizedException('Valid entry tracking credential required'),
    );

    const result = await gateway.subscribeEntry(socket as never, {
      entryId: ENTRY_A,
    });

    expect(result.ok).toBe(false);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('subscribe:queue does not join room when authorization fails', async () => {
    const socket = createSocket();
    subscriptionAuth.authorizeQueueSubscription.mockRejectedValue(
      new UnauthorizedException('Staff authentication required'),
    );

    const result = await gateway.subscribeQueue(socket as never, {
      queueId: QUEUE_A,
    });

    expect(result.ok).toBe(false);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('subscribe:queue-display joins room only after authorization succeeds', async () => {
    const socket = createSocket();
    subscriptionAuth.authorizeQueueDisplaySubscription.mockResolvedValue({
      id: QUEUE_A,
      businessId: 'biz-a',
    });

    const result = await gateway.subscribeQueueDisplay(socket as never, {
      queueId: QUEUE_A,
      displayToken: 'display-token',
    });

    expect(result).toEqual({ ok: true, room: `queue:${QUEUE_A}:display` });
    expect(socket.join).toHaveBeenCalledWith(`queue:${QUEUE_A}:display`);
  });
});
