import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueOperationsService } from '../queue-operations.service';
import { QueueSnapshotEnrichmentService } from '../queue-snapshot-enrichment.service';
import {
  NotificationPreference,
  QueueEngineService,
} from '../../../queue-engine';

describe('QueueOperationsService', () => {
  let service: QueueOperationsService;
  let engine: Record<string, ReturnType<typeof vi.fn>>;
  let enrichment: QueueSnapshotEnrichmentService;

  beforeEach(() => {
    engine = {
      joinQueue: vi.fn().mockResolvedValue({ entryId: 'e1' }),
      walkInCustomer: vi.fn().mockResolvedValue({ entryId: 'e2' }),
      callNextCustomer: vi.fn().mockResolvedValue({
        toProps: () => ({ id: 'e1', status: 'CALLED' }),
      }),
      getLiveQueueSnapshot: vi.fn().mockResolvedValue({ queueId: 'q1', entries: [] }),
      calculateQueueMetrics: vi.fn().mockResolvedValue({ waitingCount: 0 }),
      estimateWaitTime: vi.fn().mockResolvedValue({ position: 1 }),
      holdCustomer: vi.fn().mockResolvedValue({ toProps: () => ({ id: 'e1' }) }),
      completeCustomer: vi
        .fn()
        .mockResolvedValue({ toProps: () => ({ id: 'e1', status: 'COMPLETED' }) }),
    };
    enrichment = new QueueSnapshotEnrichmentService();
    service = new QueueOperationsService(
      engine as unknown as QueueEngineService,
      enrichment,
    );
  });

  it('join calls joinQueue by default', async () => {
    await service.join('q1', {
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    expect(engine.joinQueue).toHaveBeenCalled();
  });

  it('walkIn uses walkInCustomer', async () => {
    await service.walkIn('q1', {
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    expect(engine.walkInCustomer).toHaveBeenCalled();
    expect(engine.joinQueue).not.toHaveBeenCalled();
  });

  it('callNext returns entry props', async () => {
    await expect(service.callNext('q1')).resolves.toEqual({
      id: 'e1',
      status: 'CALLED',
    });
  });

  it('snapshot enriches engine snapshot', async () => {
    const enriched = await service.snapshot('q1');
    expect(enriched.queueId).toBe('q1');
    expect(enriched.serviceMode).toBe('DINE_IN');
    expect(enriched.entries).toEqual([]);
  });
});
