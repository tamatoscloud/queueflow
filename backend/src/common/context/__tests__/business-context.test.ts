import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { BusinessContext } from '../business-context';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/auth.interfaces';

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'a@b.com',
    fullName: 'Test User',
    businessId: 'biz-a',
    sessionId: 'sess-1',
    roles: ['OWNER'],
    permissions: [],
    branchIds: null,
    isPlatformAdmin: false,
    ...overrides,
  };
}

describe('BusinessContext', () => {
  let context: BusinessContext;

  beforeEach(() => {
    context = new BusinessContext();
    context.setUser(makeUser());
  });

  it('assertTenantAccess allows same-business access', () => {
    expect(() => context.assertTenantAccess('biz-a')).not.toThrow();
  });

  it('assertTenantAccess denies cross-tenant access with 403', () => {
    expect(() => context.assertTenantAccess('biz-b')).toThrow(ForbiddenException);
    try {
      context.assertTenantAccess('biz-b');
    } catch (e) {
      expect((e as ForbiddenException).getStatus()).toBe(403);
      expect((e as ForbiddenException).message).toBe('TENANT_ACCESS_DENIED');
    }
  });

  it('assertTenantAccess allows platform admin cross-tenant access', () => {
    context.setUser(makeUser({ businessId: null, isPlatformAdmin: true }));
    expect(() => context.assertTenantAccess('biz-b')).not.toThrow();
  });

  it('resolveBusinessId returns JWT businessId for tenant user', () => {
    expect(context.resolveBusinessId()).toBe('biz-a');
  });

  it('resolveBusinessId denies cross-tenant override for tenant user', () => {
    expect(() => context.resolveBusinessId('biz-b')).toThrow(ForbiddenException);
  });

  it('resolveBusinessId allows platform admin override', () => {
    context.setUser(makeUser({ businessId: null, isPlatformAdmin: true }));
    expect(context.resolveBusinessId('biz-b')).toBe('biz-b');
  });
});
