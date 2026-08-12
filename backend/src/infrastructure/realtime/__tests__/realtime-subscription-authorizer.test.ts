import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { RealtimeSubscriptionAuthorizer } from '../services/realtime-subscription-authorizer.service';
import type { SocketAuthService } from '../services/socket-auth.service';
import type { RealtimeCredentialService } from '../services/realtime-credential.service';
import type { AuthService } from '../../../modules/auth/auth.service';
import { Permission } from '../../../modules/auth/constants/roles-permissions';

const BIZ_A = '00000000-0000-4000-8000-000000000001';
const BIZ_B = '00000000-0000-4000-8000-000000000002';
const QUEUE_A = '00000000-0000-4000-8000-000000000010';
const QUEUE_B = '00000000-0000-4000-8000-000000000020';
const ENTRY_A = '00000000-0000-4000-8000-000000000030';
const ENTRY_B = '00000000-0000-4000-8000-000000000040';

function staffSocket(businessId: string, permissions = [Permission.QUEUE_OPERATE]) {
  return {
    data: {
      isStaff: true,
      user: {
        id: 'user-1',
        businessId,
        sessionId: 'sess-1',
        permissions,
        isPlatformAdmin: false,
      },
    },
  } as never;
}

function publicSocket() {
  return { data: { isStaff: false } } as never;
}

describe('RealtimeSubscriptionAuthorizer', () => {
  let authorizer: RealtimeSubscriptionAuthorizer;
  let prisma: {
    queue: { findFirst: ReturnType<typeof vi.fn> };
    queueEntry: { findFirst: ReturnType<typeof vi.fn> };
  };
  let socketAuth: {
    assertStaff: ReturnType<typeof vi.fn>;
    assertQueuePermission: ReturnType<typeof vi.fn>;
    assertEntryBusinessAccess: ReturnType<typeof vi.fn>;
  };
  let credentials: {
    verifyEntryTrackingToken: ReturnType<typeof vi.fn>;
    verifyQueueDisplayToken: ReturnType<typeof vi.fn>;
  };
  let authService: { validateSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      queue: { findFirst: vi.fn() },
      queueEntry: { findFirst: vi.fn() },
    };
    socketAuth = {
      assertStaff: vi.fn((socket) => {
        if (!socket.data?.isStaff || !socket.data.user) {
          throw new UnauthorizedException('Staff authentication required');
        }
        return socket.data.user;
      }),
      assertQueuePermission: vi.fn((socket) => socket.data.user),
      assertEntryBusinessAccess: vi.fn((socket) => socket.data.user),
    };
    credentials = {
      verifyEntryTrackingToken: vi.fn(),
      verifyQueueDisplayToken: vi.fn(),
    };
    authService = { validateSession: vi.fn().mockResolvedValue(undefined) };

    authorizer = new RealtimeSubscriptionAuthorizer(
      prisma as never,
      socketAuth as unknown as SocketAuthService,
      credentials as unknown as RealtimeCredentialService,
      authService as unknown as AuthService,
    );
  });

  describe('subscribe:queue (staff)', () => {
    it('rejects unauthenticated subscribe:queue', async () => {
      await expect(
        authorizer.authorizeQueueSubscription(publicSocket(), QUEUE_A),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects Business A subscribing to Business B queue', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
      });
      socketAuth.assertQueuePermission.mockImplementation(() => {
        throw new UnauthorizedException('Business access denied');
      });

      await expect(
        authorizer.authorizeQueueSubscription(staffSocket(BIZ_A), QUEUE_B),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows Business A subscribing to Business A queue', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_A,
        businessId: BIZ_A,
      });

      await expect(
        authorizer.authorizeQueueSubscription(staffSocket(BIZ_A), QUEUE_A),
      ).resolves.toEqual({ id: QUEUE_A, businessId: BIZ_A });
    });

    it('rejects user without queue permission', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_A,
        businessId: BIZ_A,
      });
      socketAuth.assertQueuePermission.mockImplementation(() => {
        throw new UnauthorizedException('Insufficient queue permissions');
      });

      await expect(
        authorizer.authorizeQueueSubscription(
          staffSocket(BIZ_A, [Permission.CUSTOMER_VIEW] as never),
          QUEUE_A,
        ),
      ).rejects.toThrow('Insufficient queue permissions');
    });

    it('allows platform admin cross-tenant queue subscription', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
      });
      const adminSocket = {
        data: {
          isStaff: true,
          user: {
            id: 'admin',
            businessId: null,
            sessionId: 'sess-admin',
            permissions: [Permission.QUEUE_OPERATE],
            isPlatformAdmin: true,
          },
        },
      } as never;

      await expect(
        authorizer.authorizeQueueSubscription(adminSocket, QUEUE_B),
      ).resolves.toBeTruthy();
    });
  });

  describe('subscribe:entry (customer tracking)', () => {
    it('rejects missing tracking credential', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_A,
        businessId: BIZ_A,
        queueId: QUEUE_A,
      });

      await expect(
        authorizer.authorizeEntrySubscription(publicSocket(), ENTRY_A),
      ).rejects.toThrow('Valid entry tracking credential required');
    });

    it('rejects invalid tracking credential', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_A,
        businessId: BIZ_A,
        queueId: QUEUE_A,
      });
      credentials.verifyEntryTrackingToken.mockReturnValue(false);

      await expect(
        authorizer.authorizeEntrySubscription(publicSocket(), ENTRY_A, 'bad-token'),
      ).rejects.toThrow('Valid entry tracking credential required');
    });

    it('rejects credential for Entry A on Entry B', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_B,
        businessId: BIZ_B,
        queueId: QUEUE_B,
      });
      credentials.verifyEntryTrackingToken.mockReturnValue(false);

      await expect(
        authorizer.authorizeEntrySubscription(publicSocket(), ENTRY_B, 'token-for-a'),
      ).rejects.toThrow('Valid entry tracking credential required');
    });

    it('allows valid Entry A tracking credential', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_A,
        businessId: BIZ_A,
        queueId: QUEUE_A,
      });
      credentials.verifyEntryTrackingToken.mockReturnValue(true);

      await expect(
        authorizer.authorizeEntrySubscription(publicSocket(), ENTRY_A, 'valid-token'),
      ).resolves.toEqual({
        id: ENTRY_A,
        businessId: BIZ_A,
        queueId: QUEUE_A,
      });
    });

    it('allows staff with tenant access to subscribe to entry', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_A,
        businessId: BIZ_A,
        queueId: QUEUE_A,
      });

      await expect(
        authorizer.authorizeEntrySubscription(staffSocket(BIZ_A), ENTRY_A),
      ).resolves.toBeTruthy();
      expect(socketAuth.assertEntryBusinessAccess).toHaveBeenCalledWith(
        expect.anything(),
        BIZ_A,
      );
    });
  });

  describe('subscribe:queue-display (TV)', () => {
    it('rejects missing display credential', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_A,
        businessId: BIZ_A,
      });

      await expect(
        authorizer.authorizeQueueDisplaySubscription(publicSocket(), QUEUE_A),
      ).rejects.toThrow('Valid queue display credential required');
    });

    it('rejects invalid display credential', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_A,
        businessId: BIZ_A,
      });
      credentials.verifyQueueDisplayToken.mockReturnValue(false);

      await expect(
        authorizer.authorizeQueueDisplaySubscription(
          publicSocket(),
          QUEUE_A,
          'bad',
        ),
      ).rejects.toThrow('Valid queue display credential required');
    });

    it('rejects display credential for Queue A on Queue B', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
      });
      credentials.verifyQueueDisplayToken.mockReturnValue(false);

      await expect(
        authorizer.authorizeQueueDisplaySubscription(
          publicSocket(),
          QUEUE_B,
          'queue-a-token',
        ),
      ).rejects.toThrow('Valid queue display credential required');
    });

    it('allows valid Queue A display subscription', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_A,
        businessId: BIZ_A,
      });
      credentials.verifyQueueDisplayToken.mockReturnValue(true);

      await expect(
        authorizer.authorizeQueueDisplaySubscription(
          publicSocket(),
          QUEUE_A,
          'valid-display-token',
        ),
      ).resolves.toEqual({ id: QUEUE_A, businessId: BIZ_A });
    });
  });
});
