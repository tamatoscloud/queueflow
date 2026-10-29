import { describe, expect, it } from 'vitest';
import {
  clampEstimatedWaitMinutes,
  estimateWaitMinutesForCustomersAhead,
  estimateWaitMinutesForPosition,
  MAX_ESTIMATED_WAIT_MINUTES,
  MIN_ESTIMATED_WAIT_MINUTES,
  SERVICE_SLOT_MINUTES,
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

describe('estimateWaitMinutesForPosition', () => {
  it('scales by 2.5 minutes per position', () => {
    expect(SERVICE_SLOT_MINUTES).toBe(2.5);
    expect(estimateWaitMinutesForPosition(1)).toBe(2.5);
    expect(estimateWaitMinutesForPosition(2)).toBe(5);
    expect(estimateWaitMinutesForPosition(3)).toBe(7.5);
    expect(estimateWaitMinutesForPosition(4)).toBe(10);
  });

  it('clamps at 30 minutes', () => {
    expect(estimateWaitMinutesForPosition(20)).toBe(35);
  });
});

describe('estimateWaitMinutesForCustomersAhead', () => {
  it('maps ahead count to position formula', () => {
    expect(estimateWaitMinutesForCustomersAhead(0)).toBe(2.5);
    expect(estimateWaitMinutesForCustomersAhead(1)).toBe(5);
    expect(estimateWaitMinutesForCustomersAhead(2)).toBe(7.5);
  });
});
