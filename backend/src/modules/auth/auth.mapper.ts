import { UserWithAuth } from './auth.repository';
import { SystemRole } from './constants/roles-permissions';
import type { AuthenticatedUser } from './interfaces/auth.interfaces';

export function extractPermissions(user: UserWithAuth): string[] {
  const keys = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      keys.add(rp.permission.key);
    }
  }
  return [...keys];
}

export function extractRoles(user: UserWithAuth): string[] {
  return user.userRoles.map((ur) => ur.role.name);
}

export function isPlatformAdmin(roles: string[]): boolean {
  return roles.includes(SystemRole.SUPER_ADMIN);
}

export function resolveBranchIds(user: UserWithAuth, roles: string[]): string[] | null {
  if (isPlatformAdmin(roles) || roles.includes(SystemRole.BUSINESS_OWNER)) {
    return null;
  }
  if (user.userBranches.length === 0) {
    return null;
  }
  return user.userBranches.map((ub) => ub.branchId);
}

export function toAuthenticatedUser(
  user: UserWithAuth,
  sessionId: string,
): AuthenticatedUser {
  const roles = extractRoles(user);
  const permissions = extractPermissions(user);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    businessId: user.businessId,
    sessionId,
    roles,
    permissions: permissions as AuthenticatedUser['permissions'],
    branchIds: resolveBranchIds(user, roles),
    isPlatformAdmin: isPlatformAdmin(roles),
  };
}
