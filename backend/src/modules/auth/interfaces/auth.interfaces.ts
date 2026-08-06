import type { PermissionKey } from '../constants/roles-permissions';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  businessId: string | null;
  sessionId: string;
  roles: string[];
  permissions: PermissionKey[];
  branchIds: string[] | null;
  isPlatformAdmin: boolean;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  businessId: string | null;
  sessionId: string;
  roles: string[];
  permissions: PermissionKey[];
  branchIds: string[] | null;
  type: 'access';
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
