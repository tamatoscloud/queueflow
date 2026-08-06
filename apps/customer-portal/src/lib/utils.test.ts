import { describe, expect, it } from 'vitest';
import { formatWait } from '@/lib/utils';

describe('formatWait', () => {
  it('returns Soon for zero or negative', () => {
    expect(formatWait(0)).toBe('Soon');
    expect(formatWait(-5)).toBe('Soon');
  });

  it('formats minutes under an hour', () => {
    expect(formatWait(15)).toBe('15 min');
  });

  it('formats hours and minutes', () => {
    expect(formatWait(90)).toBe('1h 30m');
    expect(formatWait(120)).toBe('2h');
  });
});
