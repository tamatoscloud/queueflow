import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminService } from '../platform-admin.service';

function makeService() {
  const prisma = {
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: 'u2', status: 'ACTIVE' }),
      update: vi.fn().mockImplementation(({ data }) => ({ id: 'u2', ...data })),
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'u2',
          email: 'a@b.c',
          fullName: 'A',
          status: 'ACTIVE',
          businessId: null,
          business: null,
          lastLoginAt: null,
          userRoles: [{ role: { name: 'OWNER' } }],
        },
      ]),
    },
  };
  const authRepo = { revokeAllSessions: vi.fn() };
  const service = new PlatformAdminService(
    prisma as never,
    {} as never,
    {} as never,
    authRepo as never,
    {} as never,
    {} as never,
  );
  return { service, prisma, authRepo };
}

describe('PlatformAdminService users', () => {
  it('revokes sessions when a user is suspended', async () => {
    const { service, authRepo } = makeService();
    await service.updateUserStatus('u2', { status: 'SUSPENDED' }, 'admin-1');
    expect(authRepo.revokeAllSessions).toHaveBeenCalledWith('u2');
  });

  it('does not revoke sessions when re-activating', async () => {
    const { service, authRepo } = makeService();
    await service.updateUserStatus('u2', { status: 'ACTIVE' }, 'admin-1');
    expect(authRepo.revokeAllSessions).not.toHaveBeenCalled();
  });

  it('blocks admins from suspending themselves', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.updateUserStatus('admin-1', { status: 'SUSPENDED' }, 'admin-1'),
    ).rejects.toThrow('own account');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('filters by role in the database query and reports platform admins by role', async () => {
    const { service, prisma } = makeService();
    const result = await service.listUsers({ role: 'OWNER', page: 1, pageSize: 20 } as never);
    const where = (prisma.user.findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where.userRoles).toEqual({ some: { role: { name: 'OWNER' } } });
    expect(result.data[0]?.isPlatformAdmin).toBe(false);
  });
});
