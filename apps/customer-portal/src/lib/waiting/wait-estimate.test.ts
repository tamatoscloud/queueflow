import { describe, expect, it } from 'vitest';
import {
  clampEstimatedWaitMinutes,
  estimateWaitForGuest,
  formatCountdownClock,
  formatEstimatedWaitLabel,
  MAX_ESTIMATED_WAIT_MINUTES,
  MIN_ESTIMATED_WAIT_MINUTES,
} from '@/lib/waiting/wait-estimate';

describe('wait-estimate bounds', () => {
  it('clamps below minimum to 2.5', () => {
    expect(clampEstimatedWaitMinutes(0)).toBe(MIN_ESTIMATED_WAIT_MINUTES);
    expect(clampEstimatedWaitMinutes(1)).toBe(MIN_ESTIMATED_WAIT_MINUTES);
    expect(clampEstimatedWaitMinutes(2.5)).toBe(2.5);
  });

  it('clamps above maximum to 35', () => {
    expect(clampEstimatedWaitMinutes(45)).toBe(MAX_ESTIMATED_WAIT_MINUTES);
    expect(clampEstimatedWaitMinutes(765)).toBe(35);
  });

  it('formats countdown clocks', () => {
    expect(formatCountdownClock(150)).toBe('2:30');
    expect(formatCountdownClock(0)).toBe('0:00');
    expect(formatCountdownClock(65)).toBe('1:05');
  });

  it('formats static wait labels', () => {
    expect(formatEstimatedWaitLabel(0)).toBe('Soon');
    expect(formatEstimatedWaitLabel(18)).toBe('18 min');
  });
});

describe('estimateWaitForGuest', () => {
  it('shows at least 2.5 min for the only guest', () => {
    expect(estimateWaitForGuest(0, 1)).toBe(2.5);
  });
  it('adds 2.5 per party ahead plus a slot by party size', () => {
    expect(estimateWaitForGuest(2, 4)).toBe(8.5);
    expect(estimateWaitForGuest(1, 8)).toBe(8);
  });
  it('caps at 35 min', () => {
    expect(estimateWaitForGuest(40, 2)).toBe(35);
  });
});
