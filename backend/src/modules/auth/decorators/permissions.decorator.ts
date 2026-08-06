import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../constants/roles-permissions';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_ANY_KEY = 'permissionsAny';

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** User needs at least one of the listed permissions. */
export const RequireAnyPermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
