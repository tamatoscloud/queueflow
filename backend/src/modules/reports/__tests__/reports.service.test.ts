import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../reports.service';
import { ReportsRepository } from '../reports.repository';
import type { QueueEngineService } from '../../../queue-engine';

describe('ReportsService', () => {
  let service: ReportsService;
  let engine: {
    calculateQueueMetrics: ReturnType<typeof vi.fn>;
    estimateWaitTime: ReturnType<typeof vi.fn>;
    getLiveQueueSnapshot: ReturnType<typeof vi.fn>;
  };
  let repository: {
    aggregateDailySummary: ReturnType<typeof vi.fn>;
  };
  let tenantScope: {
    requireQueue: ReturnType<typeof vi.fn>;
    requireQueueEntry: ReturnType<typeof vi.fn>;
    resolveRequiredBusinessId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    engine = {
      calculateQueueMetrics: vi.fn().mockResolvedValue({ waiting: 3 }),
      estimateWaitTime: vi.fn().mockResolvedValue({ minutes: 10 }),
      getLiveQueueSnapshot: vi.fn().mockResolvedValue({ entries: [] }),
    };
    repository = {
      aggregateDailySummary: vi.fn().mockResolvedValue({
        totalJoined: 5,
        completed: 3,
        cancelled: 1,
        noShows: 0,
        stillWaiting: 1,
        averageActualWaitMinutes: 12,
        minActualWaitMinutes: 5,
        maxActualWaitMinutes: 20,
        bySource: [{ source: 'QR_LANDING', count: 4 }],
      }),
    };
    tenantScope = {
      requireQueue: vi.fn().mockResolvedValue({ id: 'q-1', businessId: 'biz-1' }),
      requireQueueEntry: vi.fn().mockResolvedValue({ id: 'e-1', businessId: 'biz-1' }),
      resolveRequiredBusinessId: vi.fn((id?: string) => id ?? 'biz-1'),
    };
    service = new ReportsService(
      engine as unknown as QueueEngineService,
      repository as unknown as ReportsRepository,
      tenantScope as never,
    );
  });

  it('metrics delegates to engine', async () => {
    await expect(service.metrics('q-1')).resolves.toEqual({ waiting: 3 });
  });

  it('snapshot delegates to engine', async () => {
    await expect(service.snapshot('q-1')).resolves.toEqual({ entries: [] });
  });

  it('dailySummary maps repository aggregates', async () => {
    const result = await service.dailySummary({
      businessId: 'biz-1',
      date: '2026-07-22',
    });
    expect(result.totals.joined).toBe(5);
    expect(result.totals.completed).toBe(3);
    expect(result.date).toBe('2026-07-22');
  });
});
