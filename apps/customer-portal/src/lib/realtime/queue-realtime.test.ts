import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { pollingRealtimeAdapter } from '@/lib/realtime/queue-realtime-polling';
import {
  clearQueueSession,
  loadQueueSession,
  saveQueueSession,
  saveTrackingTokenForEntry,
} from '@/lib/storage/session';

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

    const sub = pollingRealtimeAdapter.subscribeEntryTracking('e1', fetcher, onUpdate, {
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenCalledWith({ id: 'e1' });

    sub.unsubscribe();
    const calls = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher.mock.calls.length).toBe(calls);
  });

  it('landing polling works without socket subscription', async () => {
    const fetcher = vi.fn().mockResolvedValue({ queue: { id: 'q1' } });
    const onUpdate = vi.fn();
    const sub = pollingRealtimeAdapter.subscribeQueueLanding('q1', fetcher, onUpdate, 500);
    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenCalledWith({ queue: { id: 'q1' } });
    sub.unsubscribe();
  });
});

describe('queue session trackingToken', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal('window', globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and retrieves trackingToken with session', () => {
    saveQueueSession({
      entryId: 'e1',
      queueId: 'q1',
      displayCode: 'A-001',
      joinedAt: '2026-01-01T00:00:00.000Z',
      trackingToken: 'tok-abc',
    });
    const session = loadQueueSession();
    expect(session?.trackingToken).toBe('tok-abc');
    expect(session?.entryId).toBe('e1');
  });

  it('clears trackingToken with queue session', () => {
    saveQueueSession({
      entryId: 'e1',
      queueId: 'q1',
      displayCode: 'A-001',
      joinedAt: '2026-01-01T00:00:00.000Z',
      trackingToken: 'tok-abc',
    });
    clearQueueSession();
    expect(loadQueueSession()).toBeNull();
  });

  it('join without trackingToken remains backward compatible', () => {
    saveQueueSession({
      entryId: 'e1',
      queueId: 'q1',
      displayCode: 'A-001',
      joinedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(loadQueueSession()?.trackingToken).toBeUndefined();
  });

  it('saveTrackingTokenForEntry updates matching session', () => {
    saveQueueSession({
      entryId: 'e1',
      queueId: 'q1',
      displayCode: 'A-001',
      joinedAt: '2026-01-01T00:00:00.000Z',
    });
    saveTrackingTokenForEntry('e1', 'fresh-token');
    expect(loadQueueSession()?.trackingToken).toBe('fresh-token');
  });
});
