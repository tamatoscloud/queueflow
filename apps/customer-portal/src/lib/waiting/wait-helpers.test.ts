import { describe, expect, it } from 'vitest';
import {
  computeWaitProgress,
  formatConnectionLabel,
  formatHoldCountdown,
  getSmartWaitMessage,
  resolveJourneyStep,
  tableHoldSecondsRemaining,
} from '@/lib/waiting/wait-helpers';

describe('wait-helpers', () => {
  it('resolves journey step for waiting state', () => {
    expect(resolveJourneyStep('WAITING', 5)).toBe('waiting');
    expect(resolveJourneyStep('WAITING', 2)).toBe('almost');
    expect(resolveJourneyStep('CALLED', 0)).toBe('ready');
  });

  it('returns human smart wait messages', () => {
    expect(getSmartWaitMessage('WAITING', 0)).toContain('next');
    expect(getSmartWaitMessage('WAITING', 2)).toContain('2 parties');
    expect(getSmartWaitMessage('CALLED', 0)).toMatch(/turn/i);
  });

  it('computes wait progress from baseline snapshot', () => {
    expect(computeWaitProgress(6, 3)).toBe(50);
    expect(computeWaitProgress(0, 0)).toBe(75);
  });

  it('formats connection labels without technical terms', () => {
    expect(formatConnectionLabel('connected')).toBe('Live');
    expect(formatConnectionLabel('reconnecting')).toBe('Reconnecting…');
    expect(formatConnectionLabel('disconnected')).toBe('Updating…');
  });

  it('counts down table hold from calledAt', () => {
    const calledAt = new Date(Date.now() - 60_000).toISOString();
    const remaining = tableHoldSecondsRemaining(calledAt, 5);
    expect(remaining).toBeGreaterThan(230);
    expect(remaining).toBeLessThanOrEqual(240);
  });

  it('formats hold countdown as mm:ss', () => {
    expect(formatHoldCountdown(125)).toBe('2:05');
  });
});
