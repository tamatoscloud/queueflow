import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SocketAuthService } from '../services/socket-auth.service';
import type { TokenService } from '../../../modules/auth/token.service';
import { Permission } from '../../../modules/auth/constants/roles-permissions';

describe('SocketAuthService', () => {
  const tokens = {
    verifyAccess: vi.fn(),
  } as unknown as TokenService;

  const service = new SocketAuthService(tokens);

  it('allows public connections without token', () => {
    const socket = { handshake: { auth: {}, query: {} }, data: {} } as never;
    const data = service.authenticateHandshake(socket);
    expect(data.isStaff).toBe(false);
  });

  it('authenticates staff with valid JWT', () => {
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

    const data = service.authenticateHandshake(socket);
    expect(data.isStaff).toBe(true);
    expect(data.user?.id).toBe('u1');
  });

  it('denies cross-tenant business access', () => {
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
