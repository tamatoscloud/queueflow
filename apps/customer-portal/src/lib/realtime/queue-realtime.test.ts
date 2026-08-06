import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { pollingRealtimeAdapter } from '@/lib/realtime/queue-realtime-polling';

describe('pollingRealtimeAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls fetcher on interval and stops after unsubscribe', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 'e1' });
    const onUpdate = vi.fn();

    const sub = pollingRealtimeAdapter.subscribeEntryTracking('e1', fetcher, onUpdate, 1000);

    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenCalledWith({ id: 'e1' });

    sub.unsubscribe();
    const calls = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher.mock.calls.length).toBe(calls);
  });
});
