import { describe, it, expect } from 'vitest';
import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies passwords', async () => {
    const hash = await service.hash('Password123!');
    expect(await service.verify('Password123!', hash)).toBe(true);
    expect(await service.verify('wrong', hash)).toBe(false);
  });

  it('detects higher-cost hashes that should be rehashed', () => {
    expect(service.needsRehash('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
    expect(service.needsRehash('$2b$10$abcdefghijklmnopqrstuv')).toBe(false);
  });
});
