import { Injectable } from '@nestjs/common';
import { AuthTokenType, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type UserWithAuth = Prisma.UserGetPayload<{
  include: {
    userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } };
    userBranches: true;
  };
}>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<UserWithAuth | null> {
    return this.prisma.user.findFirst({
      relationLoadStrategy: 'join',
      where: { email: email.toLowerCase(), deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        userBranches: true,
      },
    });
  }

  findUserById(id: string): Promise<UserWithAuth | null> {
    return this.prisma.user.findFirst({
      relationLoadStrategy: 'join',
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        userBranches: true,
      },
    });
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  findSession(sessionId: string) {
    return this.prisma.deviceSession.findUnique({ where: { id: sessionId } });
  }

  findSessionByRefreshHash(refreshTokenHash: string) {
    return this.prisma.deviceSession.findFirst({
      where: { refreshTokenHash, revokedAt: null },
    });
  }

  findSessionByUserAndDevice(userId: string, deviceId: string) {
    return this.prisma.deviceSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  upsertSession(data: {
    userId: string;
    deviceId: string;
    deviceName?: string;
    platform: Prisma.DeviceSessionCreateInput['platform'];
    refreshTokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return this.prisma.deviceSession.upsert({
      where: { userId_deviceId: { userId: data.userId, deviceId: data.deviceId } },
      create: data,
      update: {
        refreshTokenHash: data.refreshTokenHash,
        deviceName: data.deviceName,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        lastActiveAt: new Date(),
        revokedAt: null,
      },
    });
  }

  revokeSession(sessionId: string) {
    return this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllSessions(userId: string, exceptSessionId?: string) {
    return this.prisma.deviceSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  createAuthToken(data: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.authToken.create({ data });
  }

  findValidAuthToken(tokenHash: string, type: AuthTokenType) {
    return this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  markAuthTokenUsed(id: string) {
    return this.prisma.authToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  invalidateAuthTokens(userId: string, type: AuthTokenType) {
    return this.prisma.authToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
