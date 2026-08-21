import { describe, expect, it } from 'vitest';
import {
  clampEstimatedWaitMinutes,
  MAX_ESTIMATED_WAIT_MINUTES,
  MIN_ESTIMATED_WAIT_MINUTES,
} from './wait-estimate-bounds';

describe('clampEstimatedWaitMinutes', () => {
  it('applies 2.5 minute floor', () => {
    expect(clampEstimatedWaitMinutes(0)).toBe(MIN_ESTIMATED_WAIT_MINUTES);
    expect(clampEstimatedWaitMinutes(1)).toBe(2.5);
  });

  it('applies 30 minute ceiling', () => {
    expect(clampEstimatedWaitMinutes(100)).toBe(MAX_ESTIMATED_WAIT_MINUTES);
  });

  it('passes through in-range values', () => {
    expect(clampEstimatedWaitMinutes(10)).toBe(10);
    expect(clampEstimatedWaitMinutes(2.5)).toBe(2.5);
  });
});
