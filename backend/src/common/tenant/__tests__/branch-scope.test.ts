import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { BusinessContext } from '../../context/business-context';
import { TenantScopeService } from '../tenant-scope.service';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/auth.interfaces';

const BIZ = '00000000-0000-4000-8000-000000000001';
const BRANCH_A = '00000000-0000-4000-8000-0000000000a1';
const BRANCH_B = '00000000-0000-4000-8000-0000000000b2';
const QUEUE_ID = '00000000-0000-4000-8000-000000000010';
const ENTRY_ID = '00000000-0000-4000-8000-000000000040';

function user(branchIds: string[] | null, isPlatformAdmin = false): AuthenticatedUser {
  return {
    id: 'u-1',
    email: 'staff@example.com',
    fullName: 'Staff',
    businessId: isPlatformAdmin ? null : BIZ,
    sessionId: 's-1',
    roles: [isPlatformAdmin ? 'SUPER_ADMIN' : 'STAFF'],
    permissions: [],
    branchIds,
    isPlatformAdmin,
  };
}

function scopeFor(actor: AuthenticatedUser, branchId: string) {
  const prisma = {
    queue: {
      findFirst: vi.fn().mockResolvedValue({ id: QUEUE_ID, businessId: BIZ, branchId }),
    },
    queueEntry: {
      findFirst: vi.fn().mockResolvedValue({ id: ENTRY_ID, businessId: BIZ, branchId }),
    },
    branch: {
      findFirst: vi.fn().mockResolvedValue({ id: branchId, businessId: BIZ }),
    },
  };
  const ctx = new BusinessContext();
  ctx.setUser(actor);
  return new TenantScopeService(ctx, prisma as never);
}

describe('Branch scope', () => {
  it('lets staff act on queues, entries and branches they are assigned to', async () => {
    const scope = scopeFor(user([BRANCH_A]), BRANCH_A);
    await expect(scope.requireQueue(QUEUE_ID)).resolves.toBeTruthy();
    await expect(scope.requireQueueEntry(ENTRY_ID)).resolves.toBeTruthy();
    await expect(scope.requireBranch(BRANCH_A)).resolves.toBeTruthy();
  });

  it('blocks staff from another branch of the same business', async () => {
    const scope = scopeFor(user([BRANCH_A]), BRANCH_B);
    await expect(scope.requireQueue(QUEUE_ID)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scope.requireQueueEntry(ENTRY_ID)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scope.requireBranch(BRANCH_B)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats branchIds = null (owners, unassigned staff) as every branch', async () => {
    const scope = scopeFor(user(null), BRANCH_B);
    await expect(scope.requireQueue(QUEUE_ID)).resolves.toBeTruthy();
  });

  it('never restricts platform admins', async () => {
    const scope = scopeFor(user([BRANCH_A], true), BRANCH_B);
    await expect(scope.requireQueue(QUEUE_ID)).resolves.toBeTruthy();
  });
});
