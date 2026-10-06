import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const emitMock = vi.fn();
const timeoutMock = vi.fn(() => ({ emit: emitMock }));
const onMock = vi.fn();
const offMock = vi.fn();
const connectMock = vi.fn();

vi.mock('@/lib/realtime/socket-client', () => ({
  getSharedSocket: () => ({
    connected: true,
    connect: connectMock,
    on: onMock,
    off: offMock,
    timeout: timeoutMock,
    emit: emitMock,
  }),
}));

describe('hybridRealtimeAdapter entry subscription', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    timeoutMock.mockReturnValue({ emit: emitMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ackOk = (
    _event: string,
    _body: unknown,
    cb?: (err: Error | null, ack: { ok: boolean; error?: string }) => void,
  ) => {
    if (typeof cb === 'function') cb(null, { ok: true });
  };

  it('subscribe:entry includes trackingToken with entryId', async () => {
    emitMock.mockImplementation(ackOk);

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const fetcher = vi.fn().mockResolvedValue({ entry: { id: 'e1' } });
    const onUpdate = vi.fn();

    const sub = hybridRealtimeAdapter.subscribeEntryTracking('e1', fetcher, onUpdate, {
      trackingToken: 'tok-1',
      intervalMs: 60_000,
    });

    await vi.waitFor(() => {
      expect(emitMock).toHaveBeenCalled();
    });

    const [event, body] = emitMock.mock.calls.find(
      (c) => c[0] === 'subscribe:entry',
    )!;
    expect(event).toBe('subscribe:entry');
    expect(body).toEqual({ entryId: 'e1', trackingToken: 'tok-1' });

    sub.unsubscribe();
  });

  it('recovers token when missing then subscribes', async () => {
    emitMock.mockImplementation(ackOk);
    const recoverToken = vi.fn().mockResolvedValue('recovered-tok');
    const onToken = vi.fn();

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const sub = hybridRealtimeAdapter.subscribeEntryTracking(
      'e1',
      vi.fn().mockResolvedValue({}),
      vi.fn(),
      { recoverToken, onToken, intervalMs: 60_000 },
    );

    await vi.waitFor(() => expect(recoverToken).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(onToken).toHaveBeenCalledWith('recovered-tok'));
    await vi.waitFor(() => {
      const call = emitMock.mock.calls.find((c) => c[0] === 'subscribe:entry');
      expect(call?.[1]).toEqual({ entryId: 'e1', trackingToken: 'recovered-tok' });
    });

    sub.unsubscribe();
  });

  it('retries once after failed ack then stops (no infinite loop)', async () => {
    let attempts = 0;
    emitMock.mockImplementation(
      (
        _event: string,
        _body: unknown,
        cb?: (err: Error | null, ack: { ok: boolean; error?: string }) => void,
      ) => {
        if (typeof cb !== 'function') return;
        attempts += 1;
        cb(null, { ok: false, error: 'unauthorized' });
      },
    );
    const recoverToken = vi.fn().mockResolvedValue('fresh-tok');

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const sub = hybridRealtimeAdapter.subscribeEntryTracking(
      'e1',
      vi.fn().mockResolvedValue({}),
      vi.fn(),
      {
        trackingToken: 'stale-tok',
        recoverToken,
        intervalMs: 60_000,
      },
    );

    await vi.waitFor(() => expect(recoverToken).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(attempts).toBe(2));

    // No further recovery
    await new Promise((r) => setTimeout(r, 50));
    expect(recoverToken).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);

    sub.unsubscribe();
  });

  it('falls back to polling when recovery fails', async () => {
    vi.useFakeTimers();
    emitMock.mockImplementation(
      (
        _event: string,
        _body: unknown,
        cb?: (err: Error | null, ack: { ok: boolean }) => void,
      ) => {
        if (typeof cb === 'function') cb(null, { ok: false });
      },
    );
    const recoverToken = vi.fn().mockResolvedValue(null);
    const fetcher = vi.fn().mockResolvedValue({ id: 'e1' });
    const onUpdate = vi.fn();

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const sub = hybridRealtimeAdapter.subscribeEntryTracking('e1', fetcher, onUpdate, {
      trackingToken: 'bad',
      recoverToken,
      intervalMs: 1000,
    });

    await vi.waitFor(() => expect(recoverToken).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith({ id: 'e1' });

    sub.unsubscribe();
    vi.useRealTimers();
  });

  it('keeps a backup HTTP poll after a successful subscribe', async () => {
    vi.useFakeTimers();
    emitMock.mockImplementation(ackOk);
    const fetcher = vi.fn().mockResolvedValue({ id: 'e1' });
    const onUpdate = vi.fn();

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const sub = hybridRealtimeAdapter.subscribeEntryTracking('e1', fetcher, onUpdate, {
      trackingToken: 'tok-1',
      intervalMs: 1000,
    });

    await vi.waitFor(() => expect(emitMock).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(0);
    const afterSubscribe = fetcher.mock.calls.length;
    expect(afterSubscribe).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetcher.mock.calls.length).toBeGreaterThan(afterSubscribe);

    sub.unsubscribe();
    vi.useRealTimers();
  });

  it('refetches HTTP on CustomerCalled even when patching from events', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    onMock.mockImplementation((event: string, fn: (...args: unknown[]) => void) => {
      handlers.set(event, fn);
    });
    emitMock.mockImplementation(ackOk);
    const fetcher = vi.fn().mockResolvedValue({ id: 'e1' });
    const onRealtimeEvent = vi.fn();

    const { hybridRealtimeAdapter } = await import('@/lib/realtime/queue-realtime');
    const sub = hybridRealtimeAdapter.subscribeEntryTracking('e1', fetcher, vi.fn(), {
      trackingToken: 'tok-1',
      intervalMs: 60_000,
      patchFromEvents: true,
      onRealtimeEvent,
    });

    await vi.waitFor(() => expect(handlers.has('CustomerCalled')).toBe(true));
    await vi.waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(0));
    const before = fetcher.mock.calls.length;

    handlers.get('CustomerCalled')?.({
      event: 'CustomerCalled',
      payload: { entryId: 'e1' },
    });

    await vi.waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(before));
    expect(onRealtimeEvent).toHaveBeenCalled();

    sub.unsubscribe();
  });
});
