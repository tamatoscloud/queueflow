import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { CustomerPortalService } from '../customer-portal.service';

const ENTRY_ID = '00000000-0000-4000-8000-000000000040';
const GOOD = 'good-token';

function makeService() {
  const entry = {
    id: ENTRY_ID,
    queueId: 'q-1',
    businessId: 'b-1',
    branchId: 'br-1',
    customerId: 'c-1',
    status: 'WAITING',
    estimatedWaitMinutes: 5,
    partySize: 2,
    joinedAt: new Date(),
    calledAt: null,
    notes: null,
    metadata: null,
    queueToken: { displayCode: 'A-01' },
    queue: {
      id: 'q-1',
      name: 'Dine-in',
      status: 'ACTIVE',
      isAcceptingEntries: true,
      serviceMode: 'DINE_IN',
      priorityEnabled: false,
      business: { id: 'b-1', name: 'Bella', logoUrl: null },
      branch: { id: 'br-1', name: 'Main' },
    },
    customer: { id: 'c-1', businessId: 'b-1', phone: '+923001111111' },
    feedback: null,
  };
  const prisma = {
    queueEntry: {
      findFirst: vi.fn().mockResolvedValue(entry),
      findMany: vi.fn().mockResolvedValue([{ id: ENTRY_ID, sortOrder: 1, joinedAt: new Date(), isVip: false, priority: 0 }]),
      update: vi.fn().mockResolvedValue(entry),
    },
    customer: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const credentials = {
    issueEntryTrackingToken: vi.fn().mockReturnValue('fresh-token'),
    verifyEntryTrackingToken: vi.fn((token: string, id: string) => token === GOOD && id === ENTRY_ID),
  };
  const webPush = {
    isEnabled: vi.fn().mockReturnValue(true),
    upsertSubscription: vi.fn().mockResolvedValue({ ok: true }),
  };
  const service = new CustomerPortalService(
    prisma as never,
    {} as never,
    credentials as never,
    webPush as never,
  );
  return { service, prisma, credentials, webPush };
}

describe('Customer portal guest token rules', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('returns read-only tracking (no token) for a bare entry id', async () => {
    const result = await ctx.service.getEntryTracking(ENTRY_ID);
    expect(result.trackingToken).toBeUndefined();
    expect(result.position).toBe(1);
    expect(ctx.credentials.issueEntryTrackingToken).not.toHaveBeenCalled();
  });

  it('refreshes the token only for a caller that already holds a valid one', async () => {
    expect((await ctx.service.getEntryTracking(ENTRY_ID, 'forged')).trackingToken).toBeUndefined();
    expect((await ctx.service.getEntryTracking(ENTRY_ID, GOOD)).trackingToken).toBe('fresh-token');
  });

  it('refuses a phone change without the guest token', async () => {
    await expect(
      ctx.service.updateEntryContact(ENTRY_ID, { phone: '+923002222222' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      ctx.service.updateEntryContact(ENTRY_ID, { phone: '+923002222222', trackingToken: 'forged' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.prisma.customer.update).not.toHaveBeenCalled();
  });

  it('allows a phone change with the guest token', async () => {
    const result = await ctx.service.updateEntryContact(ENTRY_ID, {
      phone: '+923002222222',
      trackingToken: GOOD,
    });
    expect(result.entryId).toBe(ENTRY_ID);
    expect(ctx.prisma.customer.update).toHaveBeenCalled();
  });

  it('refuses web push subscription without the guest token', async () => {
    await expect(
      ctx.service.subscribeWebPush({
        entryId: ENTRY_ID,
        endpoint: 'https://push.example/abc',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.webPush.upsertSubscription).not.toHaveBeenCalled();
  });

  it('refuses feedback without the guest token', async () => {
    await expect(
      ctx.service.submitFeedback({ queueEntryId: ENTRY_ID, rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
