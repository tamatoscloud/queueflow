import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { AuthService } from '../../../modules/auth/auth.service';
import { TokenService } from '../../../modules/auth/token.service';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/auth.interfaces';
import { Permission, SystemRole } from '../../../modules/auth/constants/roles-permissions';

export type SocketClientData = {
  user?: AuthenticatedUser;
  isStaff: boolean;
};

export type AuthenticatedSocket = Socket & { data: SocketClientData };

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly authService: AuthService,
  ) {}

  async authenticateHandshake(socket: AuthenticatedSocket): Promise<SocketClientData> {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      socket.data = { isStaff: false };
      return socket.data;
    }

    try {
      const payload = this.tokens.verifyAccess(token);
      await this.authService.validateSession(payload.sessionId);
      socket.data = {
        isStaff: true,
        user: {
          id: payload.sub,
          email: payload.email,
          fullName: '',
          businessId: payload.businessId,
          sessionId: payload.sessionId,
          roles: payload.roles,
          permissions: payload.permissions,
          branchIds: payload.branchIds,
          isPlatformAdmin: payload.roles.includes(SystemRole.SUPER_ADMIN),
        },
      };
      return socket.data;
    } catch {
      throw new UnauthorizedException('Invalid socket token');
    }
  }

  assertStaff(socket: AuthenticatedSocket): AuthenticatedUser {
    if (!socket.data?.isStaff || !socket.data.user) {
      throw new UnauthorizedException('Staff authentication required');
    }
    return socket.data.user;
  }

  assertBusinessAccess(socket: AuthenticatedSocket, businessId: string): AuthenticatedUser {
    const user = this.assertStaff(socket);
    if (user.isPlatformAdmin) return user;
    if (user.businessId !== businessId) {
      throw new UnauthorizedException('Business access denied');
    }
    return user;
  }

  assertEntryBusinessAccess(
    socket: AuthenticatedSocket,
    resourceBusinessId: string,
  ): AuthenticatedUser {
    const user = this.assertStaff(socket);
    if (user.isPlatformAdmin) return user;
    if (!user.businessId || user.businessId !== resourceBusinessId) {
      throw new UnauthorizedException('Business access denied');
    }
    return user;
  }

  assertQueuePermission(socket: AuthenticatedSocket, businessId: string): AuthenticatedUser {
    const user = this.assertBusinessAccess(socket, businessId);
    const canView =
      user.permissions.includes(Permission.QUEUE_OPERATE) ||
      user.permissions.includes(Permission.QUEUE_MANAGE) ||
      user.permissions.includes(Permission.REPORTS_VIEW);
    if (!canView && !user.isPlatformAdmin) {
      throw new UnauthorizedException('Insufficient queue permissions');
    }
    return user;
  }
}
