import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DomainEvent } from '../../../queue-engine';
import { QueueRealtimeBridgeService } from '../services/queue-realtime-bridge.service';
import type { QueueRealtimeEmitterService } from '../services/queue-realtime-emitter.service';
import type { QueueEngineService } from '../../../queue-engine';

describe('QueueRealtimeBridgeService', () => {
  let bridge: QueueRealtimeBridgeService;
  let emitter: QueueRealtimeEmitterService;
  let engine: Pick<QueueEngineService, 'getLiveQueueSnapshot' | 'estimateWaitTime'>;

  beforeEach(() => {
    emitter = {
      emitToQueue: vi.fn(),
      emitToBusiness: vi.fn(),
      emitToEntry: vi.fn(),
      emitEstimatedWait: vi.fn(),
      bindServer: vi.fn(),
    } as unknown as QueueRealtimeEmitterService;

    engine = {
      getLiveQueueSnapshot: vi.fn().mockResolvedValue({
        generatedAt: new Date('2026-07-22T12:00:00Z'),
        averageServiceTimeMinutes: 5,
        metrics: { waitingCount: 2 },
        entries: [
          { id: 'e1', status: 'WAITING', position: 1 },
          { id: 'e2', status: 'WAITING', position: 2 },
        ],
      }),
      estimateWaitTime: vi
        .fn()
        .mockResolvedValueOnce({ position: 1, estimatedWaitMinutes: 5, customersAhead: 0 })
        .mockResolvedValueOnce({ position: 2, estimatedWaitMinutes: 10, customersAhead: 1 }),
    };

    bridge = new QueueRealtimeBridgeService(
      { subscribe: vi.fn() } as never,
      emitter,
      engine as QueueEngineService,
    );
  });

  it('maps CustomerJoined to socket event and entry room', async () => {
    const event: DomainEvent<'CustomerJoined'> = {
      type: 'CustomerJoined',
      aggregateId: 'q1',
      businessId: 'b1',
      occurredAt: new Date(),
      payload: { entryId: 'e1', displayCode: 'A-01' },
    };

    await bridge.handleDomainEvent(event);

    expect(emitter.emitToQueue).toHaveBeenCalledWith(
      'q1',
      'CustomerJoined',
      expect.objectContaining({ queueId: 'q1', businessId: 'b1' }),
    );
    expect(emitter.emitToEntry).toHaveBeenCalledWith(
      'e1',
      'CustomerJoined',
      expect.any(Object),
    );
    expect(emitter.emitEstimatedWait).toHaveBeenCalled();
  });

  it('maps QueuePaused without entry room', async () => {
    const event: DomainEvent<'QueuePaused'> = {
      type: 'QueuePaused',
      aggregateId: 'q1',
      businessId: 'b1',
      occurredAt: new Date(),
      payload: {},
    };

    await bridge.handleDomainEvent(event);

    expect(emitter.emitToQueue).toHaveBeenCalledWith('q1', 'QueuePaused', expect.any(Object));
    expect(emitter.emitToEntry).not.toHaveBeenCalled();
  });
});
