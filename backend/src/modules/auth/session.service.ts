import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { generateDeviceId, generateOpaqueToken, hashToken } from './utils/token.util';
import { toAuthenticatedUser } from './auth.mapper';
import type { AuthTokensResponse } from './interfaces/auth.interfaces';

export interface LoginContext {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  platform?: DevicePlatform;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  private refreshTtlMs(): number {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
    return days * 24 * 60 * 60 * 1000;
  }

  async login(
    ctx: LoginContext,
  ): Promise<AuthTokensResponse & { user: ReturnType<typeof toAuthenticatedUser> }> {
    const user = await this.authRepo.findUserByEmail(ctx.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await this.passwordService.verify(ctx.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const deviceId = ctx.deviceId ?? generateDeviceId();
    const refreshRaw = generateOpaqueToken(48);
    const refreshHash = hashToken(refreshRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    const session = await this.authRepo.upsertSession({
      userId: user.id,
      deviceId,
      deviceName: ctx.deviceName,
      platform: ctx.platform ?? DevicePlatform.WEB,
      refreshTokenHash: refreshHash,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      expiresAt,
    });

    await this.authRepo.updateLastLogin(user.id);
    const authUser = toAuthenticatedUser(user, session.id);
    const accessToken = this.tokenService.signAccess({
      sub: authUser.id,
      email: authUser.email,
      businessId: authUser.businessId,
      sessionId: session.id,
      roles: authUser.roles,
      permissions: authUser.permissions,
      branchIds: authUser.branchIds,
    });

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: this.tokenService.accessExpiresIn,
      tokenType: 'Bearer',
      user: authUser,
    };
  }

  async refresh(
    refreshToken: string,
    ctx?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokensResponse> {
    const tokenHash = hashToken(refreshToken);
    const session = await this.authRepo.findSessionByRefreshHash(tokenHash);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.authRepo.findUserById(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const newRefreshRaw = generateOpaqueToken(48);
    const newRefreshHash = hashToken(newRefreshRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    await this.authRepo.upsertSession({
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName: session.deviceName ?? undefined,
      platform: session.platform,
      refreshTokenHash: newRefreshHash,
      ipAddress: ctx?.ipAddress ?? session.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? session.userAgent ?? undefined,
      expiresAt,
    });

    const authUser = toAuthenticatedUser(user, session.id);
    const accessToken = this.tokenService.signAccess({
      sub: authUser.id,
      email: authUser.email,
      businessId: authUser.businessId,
      sessionId: session.id,
      roles: authUser.roles,
      permissions: authUser.permissions,
      branchIds: authUser.branchIds,
    });

    return {
      accessToken,
      refreshToken: newRefreshRaw,
      expiresIn: this.tokenService.accessExpiresIn,
      tokenType: 'Bearer',
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.authRepo.revokeSession(sessionId);
  }

  async logoutAll(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.authRepo.revokeAllSessions(userId, exceptSessionId);
    return result.count;
  }
}
