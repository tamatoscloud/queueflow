import { describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { RealtimeCredentialService } from '../services/realtime-credential.service';

describe('RealtimeCredentialService', () => {
  const jwt = new JwtService({ secret: 'test-realtime-secret' });
  const service = new RealtimeCredentialService(jwt);

  it('issues and verifies entry tracking tokens', () => {
    const token = service.issueEntryTrackingToken('entry-a');
    expect(service.verifyEntryTrackingToken(token, 'entry-a')).toBe(true);
    expect(service.verifyEntryTrackingToken(token, 'entry-b')).toBe(false);
  });

  it('issues and verifies queue display tokens', () => {
    const token = service.issueQueueDisplayToken('queue-a');
    expect(service.verifyQueueDisplayToken(token, 'queue-a')).toBe(true);
    expect(service.verifyQueueDisplayToken(token, 'queue-b')).toBe(false);
  });

  it('rejects invalid tokens', () => {
    expect(service.verifyEntryTrackingToken('not-a-jwt', 'entry-a')).toBe(false);
  });

  it('rejects expired JWT tokens', () => {
    const expiredJwt = new JwtService({ secret: 'test-realtime-secret' });
    const expiredService = new RealtimeCredentialService(expiredJwt);
    const signSpy = vi.spyOn(expiredJwt, 'sign').mockReturnValue('expired-token');
    vi.spyOn(expiredJwt, 'verify').mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expiredService.issueEntryTrackingToken('entry-a');
    expect(expiredService.verifyEntryTrackingToken('expired-token', 'entry-a')).toBe(
      false,
    );
    signSpy.mockRestore();
  });
});
