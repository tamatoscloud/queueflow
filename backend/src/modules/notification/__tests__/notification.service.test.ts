import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../notification.service';
import type { AuthenticatedUser } from '../../auth/interfaces/auth.interfaces';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'u1',
    businessId: 'biz-a',
    isPlatformAdmin: false,
    permissions: [],
    ...overrides,
  } as AuthenticatedUser;
}

describe('NotificationService tenant isolation', () => {
  it('scopes list to the actor business even if another businessId is requested', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      $transaction: vi.fn(async (ops: unknown[]) => {
        await Promise.all(ops as Promise<unknown>[]);
        return [0, []];
      }),
      notification: { count, findMany },
    };
    const service = new NotificationService(prisma as never, {} as never, {} as never);

    await expect(
      service.list({ businessId: 'biz-b', page: 1, pageSize: 20 }, actor()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters list by the actor businessId', async () => {
    const count = vi.fn().mockResolvedValue(1);
    const findMany = vi.fn().mockResolvedValue([{ id: 'n1' }]);
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (ops: Array<Promise<unknown>>) =>
        Promise.all(ops),
      ),
      notification: { count, findMany },
    };
    const service = new NotificationService(prisma as never, {} as never, {} as never);

    await service.list({ page: 1, pageSize: 20 }, actor());
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: 'biz-a' }),
      }),
    );
  });

  it('requires platform admin to pass a businessId', async () => {
    const service = new NotificationService({} as never, {} as never, {} as never);
    await expect(
      service.list({ page: 1, pageSize: 20 }, actor({ isPlatformAdmin: true, businessId: null })),
    ).rejects.toMatchObject({ message: 'BUSINESS_CONTEXT_REQUIRED' });
  });
});
