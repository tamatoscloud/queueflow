import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SocketAuthService } from '../services/socket-auth.service';
import type { TokenService } from '../../../modules/auth/token.service';
import type { AuthService } from '../../../modules/auth/auth.service';
import { Permission } from '../../../modules/auth/constants/roles-permissions';

describe('SocketAuthService', () => {
  const tokens = {
    verifyAccess: vi.fn(),
  } as unknown as TokenService;

  const authService = {
    validateSession: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthService;

  const service = new SocketAuthService(tokens, authService);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.validateSession).mockResolvedValue(undefined);
  });

  it('allows public connections without token', async () => {
    const socket = { handshake: { auth: {}, query: {} }, data: {} } as never;
    const data = await service.authenticateHandshake(socket);
    expect(data.isStaff).toBe(false);
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('authenticates staff with valid JWT and validates session', async () => {
    vi.mocked(tokens.verifyAccess).mockReturnValue({
      sub: 'u1',
      email: 'a@b.com',
      businessId: 'b1',
      sessionId: 's1',
      roles: ['STAFF'],
      permissions: [Permission.QUEUE_OPERATE],
      branchIds: [],
      type: 'access',
    });

    const socket = {
      handshake: { auth: { token: 'valid' }, query: {} },
      data: {},
    } as never;

    const data = await service.authenticateHandshake(socket);
    expect(data.isStaff).toBe(true);
    expect(data.user?.id).toBe('u1');
    expect(authService.validateSession).toHaveBeenCalledWith('s1');
  });

  it('rejects invalid JWT on handshake', async () => {
    vi.mocked(tokens.verifyAccess).mockImplementation(() => {
      throw new Error('invalid');
    });

    const socket = {
      handshake: { auth: { token: 'bad' }, query: {} },
      data: {},
    } as never;

    await expect(service.authenticateHandshake(socket)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired JWT on handshake', async () => {
    vi.mocked(tokens.verifyAccess).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const socket = {
      handshake: { auth: { token: 'expired' }, query: {} },
      data: {},
    } as never;

    await expect(service.authenticateHandshake(socket)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects revoked session on handshake', async () => {
    vi.mocked(tokens.verifyAccess).mockReturnValue({
      sub: 'u1',
      email: 'a@b.com',
      businessId: 'b1',
      sessionId: 's1',
      roles: ['STAFF'],
      permissions: [Permission.QUEUE_OPERATE],
      branchIds: [],
      type: 'access',
    });
    vi.mocked(authService.validateSession).mockRejectedValue(
      new UnauthorizedException('Session expired or revoked'),
    );

    const socket = {
      handshake: { auth: { token: 'valid' }, query: {} },
      data: {},
    } as never;

    await expect(service.authenticateHandshake(socket)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('denies cross-tenant business access', () => {
    const socket = {
      handshake: { auth: { token: 'valid' }, query: {} },
      data: {
        isStaff: true,
        user: {
          id: 'u1',
          businessId: 'b1',
          permissions: [Permission.QUEUE_OPERATE],
          isPlatformAdmin: false,
        },
      },
    } as never;

    expect(() => service.assertBusinessAccess(socket, 'other-business')).toThrow(
      UnauthorizedException,
    );
  });
});
