import { describe, it, expect, vi } from 'vitest';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../guards/auth.guards';
import { Permission } from '../constants/roles-permissions';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../interfaces/auth.interfaces';

function createContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('PermissionsGuard (staff queue operations)', () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;

  const guard = new PermissionsGuard(reflector);

  it('denies walk-in without QUEUE_OPERATE permission', () => {
    vi.mocked(reflector.getAllAndOverride).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return [Permission.QUEUE_OPERATE];
      return undefined;
    });

    const user = {
      permissions: [Permission.REPORTS_VIEW],
    } as AuthenticatedUser;

    expect(() => guard.canActivate(createContext(user))).toThrow(ForbiddenException);
  });

  it('allows walk-in with QUEUE_OPERATE permission', () => {
    vi.mocked(reflector.getAllAndOverride).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return [Permission.QUEUE_OPERATE];
      return undefined;
    });

    const user = {
      permissions: [Permission.QUEUE_OPERATE],
    } as AuthenticatedUser;

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('requires authentication for staff endpoints', () => {
    vi.mocked(reflector.getAllAndOverride).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return [Permission.QUEUE_OPERATE];
      return undefined;
    });

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
