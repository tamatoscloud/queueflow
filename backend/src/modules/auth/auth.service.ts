import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenType } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { generateOpaqueToken, hashToken } from './utils/token.util';
import type {
  AcceptEmailVerificationDto,
  LoginDto,
  RefreshTokenDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly audit: AuditService,
  ) {}

  login(dto: LoginDto, meta?: { ipAddress?: string; userAgent?: string }) {
    return this.sessionService.login({
      email: dto.email,
      password: dto.password,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    }).then(async (result) => {
      await this.audit.log({
        businessId: result.user.businessId,
        actorUserId: result.user.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: result.user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      const { user, ...tokens } = result;
      return { ...tokens, user };
    });
  }

  refresh(dto: RefreshTokenDto, meta?: { ipAddress?: string; userAgent?: string }) {
    return this.sessionService.refresh(dto.refreshToken, meta);
  }

  async logout(sessionId: string, userId: string, meta?: { ipAddress?: string; userAgent?: string }) {
    await this.sessionService.logout(sessionId);
    await this.audit.log({
      actorUserId: userId,
      action: 'auth.logout',
      entityType: 'device_session',
      entityId: sessionId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { revoked: true };
  }

  async logoutAll(userId: string, exceptSessionId?: string, meta?: { ipAddress?: string; userAgent?: string }) {
    const count = await this.sessionService.logoutAll(userId, exceptSessionId);
    await this.audit.log({
      actorUserId: userId,
      action: 'auth.logout_all',
      entityType: 'user',
      entityId: userId,
      afterData: { sessionsRevoked: count },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { sessionsRevoked: count };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }
    await this.authRepo.invalidateAuthTokens(user.id, AuthTokenType.PASSWORD_RESET);
    const raw = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.authRepo.createAuthToken({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
      tokenHash: hashToken(raw),
      expiresAt,
    });
    // Email provider not in scope — return token in dev only
    const payload: Record<string, unknown> = {
      message: 'If the email exists, a reset link has been sent',
    };
    if (process.env.APP_ENV === 'development') {
      payload.resetToken = raw;
    }
    return payload;
  }

  async resetPassword(dto: ResetPasswordDto, meta?: { ipAddress?: string; userAgent?: string }) {
    const token = await this.authRepo.findValidAuthToken(
      hashToken(dto.token),
      AuthTokenType.PASSWORD_RESET,
    );
    if (!token) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hash = await this.passwordService.hash(dto.newPassword);
    await this.authRepo.updatePassword(token.userId, hash);
    await this.authRepo.markAuthTokenUsed(token.id);
    await this.authRepo.revokeAllSessions(token.userId);
    await this.audit.log({
      actorUserId: token.userId,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: token.userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return { message: 'Password updated successfully' };
  }

  async verifyEmail(dto: AcceptEmailVerificationDto) {
    const token = await this.authRepo.findValidAuthToken(
      hashToken(dto.token),
      AuthTokenType.EMAIL_VERIFICATION,
    );
    if (!token) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.authRepo.markEmailVerified(token.userId);
    await this.authRepo.markAuthTokenUsed(token.id);
    return { message: 'Email verified successfully' };
  }

  async resendEmailVerification(email: string) {
    const user = await this.authRepo.findUserByEmail(email);
    const payload: Record<string, unknown> = {
      message: 'If the email exists and is unverified, a verification message has been sent',
    };
    if (!user || user.emailVerifiedAt) {
      return payload;
    }
    await this.authRepo.invalidateAuthTokens(user.id, AuthTokenType.EMAIL_VERIFICATION);
    const raw = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.authRepo.createAuthToken({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash: hashToken(raw),
      expiresAt,
    });
    if (process.env.APP_ENV === 'development') {
      payload.verificationToken = raw;
    }
    return payload;
  }

  async issueEmailVerificationToken(userId: string): Promise<string> {
    const raw = generateOpaqueToken();
    await this.authRepo.createAuthToken({
      userId,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return raw;
  }

  async validateSession(sessionId: string): Promise<void> {
    const session = await this.authRepo.findSession(sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
  }
}
