import { describe, expect, it } from 'vitest';
import { isQueueUuid } from '@/lib/queue-id';

describe('isQueueUuid', () => {
  it('accepts RFC 4122 UUID strings', () => {
    expect(isQueueUuid('d4536ea9-0154-e5af-4b14-6cc5ce88cd2e')).toBe(true);
    expect(isQueueUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
  });

  it('rejects demo and other non-UUID queue ids', () => {
    expect(isQueueUuid('demo')).toBe(false);
    expect(isQueueUuid('/q/demo')).toBe(false);
    expect(isQueueUuid('not-a-uuid')).toBe(false);
    expect(isQueueUuid('')).toBe(false);
    expect(isQueueUuid(undefined)).toBe(false);
  });
});
