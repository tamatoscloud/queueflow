import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueOperationsService } from '../queue-operations.service';
import { QueueSnapshotEnrichmentService } from '../queue-snapshot-enrichment.service';
import {
  NotificationPreference,
  QueueEngineService,
  QueueEntrySource,
} from '../../../queue-engine';
import { Permission } from '../../auth/constants/roles-permissions';

function createPassThroughTenantScope() {
  return {
    requireQueue: vi.fn().mockResolvedValue({ id: 'q1', businessId: 'biz-1' }),
    requireQueueEntry: vi.fn().mockResolvedValue({ id: 'e1', businessId: 'biz-1' }),
    resolveRequiredBusinessId: vi.fn((id?: string) => id ?? 'biz-1'),
    resolveOptionalListBusinessId: vi.fn(() => 'biz-1'),
    requireBranch: vi.fn(),
    requireCustomer: vi.fn(),
    requireFeedback: vi.fn(),
  };
}

function createRealtimeCredentials() {
  return {
    issueEntryTrackingToken: vi.fn().mockReturnValue('tracking-token'),
    issueQueueDisplayToken: vi.fn(),
    verifyEntryTrackingToken: vi.fn(),
    verifyQueueDisplayToken: vi.fn(),
  };
}

describe('QueueOperationsService', () => {
  let service: QueueOperationsService;
  let engine: Record<string, ReturnType<typeof vi.fn>>;
  let enrichment: QueueSnapshotEnrichmentService;
  let tenantScope: ReturnType<typeof createPassThroughTenantScope>;
  let realtimeCredentials: ReturnType<typeof createRealtimeCredentials>;

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
      priorityCustomer: vi.fn().mockResolvedValue({
        toProps: () => ({ id: 'e1', priority: 99 }),
      }),
    };
    enrichment = new QueueSnapshotEnrichmentService();
    tenantScope = createPassThroughTenantScope();
    realtimeCredentials = createRealtimeCredentials();
    service = new QueueOperationsService(
      engine as unknown as QueueEngineService,
      enrichment,
      tenantScope as never,
      realtimeCredentials as never,
    );
  });

  it('join returns tracking token', async () => {
    const result = await service.join('q1', {
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    expect(result.trackingToken).toBe('tracking-token');
    expect(realtimeCredentials.issueEntryTrackingToken).toHaveBeenCalledWith('e1');
  });

  it('join calls joinQueue without operational privileges', async () => {
    await service.join('q1', {
      fullName: 'Ali',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });
    const joinQueueMock = vi.mocked(engine.joinQueue!);
    expect(joinQueueMock).toHaveBeenCalled();
    const call = joinQueueMock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    expect(call).toMatchObject({
      queueId: 'q1',
      source: QueueEntrySource.QR_LANDING,
      isVip: false,
      bypassOperatingHours: false,
    });
  });

  it('walkIn forwards VIP and priority to walkInCustomer', async () => {
    await service.walkIn('q1', {
      fullName: 'VIP Guest',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
      isVip: true,
      priority: 50,
      bypassOperatingHours: true,
    });
    expect(engine.walkInCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        isVip: true,
        priority: 50,
        bypassOperatingHours: true,
      }),
    );
  });

  it('promote forwards priority to engine', async () => {
    engine.priorityCustomer = vi.fn().mockResolvedValue({
      toProps: () => ({ id: 'e1', priority: 99 }),
    });
    await service.promote('e1', { priority: 99, isVip: true });
    expect(engine.priorityCustomer).toHaveBeenCalledWith('e1', {
      priority: 99,
      isVip: true,
    });
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
    expect(tenantScope.requireQueue).toHaveBeenCalledWith('q1');
  });

  it('snapshot enriches engine snapshot', async () => {
    const enriched = await service.snapshot('q1');
    expect(enriched).toMatchObject({
      queueId: 'q1',
      serviceMode: 'DINE_IN',
      entries: [],
    });
  });

  it('redacts customer PII from public snapshots', async () => {
    engine.getLiveQueueSnapshot = vi.fn().mockResolvedValue({
      queueId: 'q1',
      entries: [
        {
          id: 'e1',
          displayCode: 'A-001',
          status: 'WAITING',
          customerName: 'Ali Khan',
          customerPhone: '+923001111111',
          notes: 'window seat',
          partySize: 2,
          estimatedWaitMinutes: 12,
          metadata: { table: 4 },
        },
      ],
    });
    const snap = await service.snapshot('q1');
    expect(snap.entries).toEqual([
      {
        displayCode: 'A-001',
        status: 'WAITING',
        partySize: 2,
        estimatedWaitMinutes: 12,
        serviceMode: 'DINE_IN',
      },
    ]);
    expect(snap.entries[0]).not.toHaveProperty('id');
    expect(snap.entries[0]).not.toHaveProperty('customerName');
    expect(snap.entries[0]).not.toHaveProperty('customerPhone');
    expect(snap.entries[0]).not.toHaveProperty('notes');
    expect(tenantScope.requireQueue).not.toHaveBeenCalled();
  });

  it('returns private snapshot for staff with queue operate permission', async () => {
    engine.getLiveQueueSnapshot = vi.fn().mockResolvedValue({
      queueId: 'q1',
      entries: [
        {
          id: 'e1',
          displayCode: 'A-001',
          status: 'WAITING',
          customerName: 'Ali Khan',
          customerPhone: '+923001111111',
          partySize: 2,
        },
      ],
    });
    const snap = await service.snapshot('q1', {
      permissions: [Permission.QUEUE_OPERATE],
      isPlatformAdmin: false,
    });
    expect(snap.entries[0]).toMatchObject({
      id: 'e1',
      customerName: 'Ali Khan',
      customerPhone: '+923001111111',
    });
    expect(tenantScope.requireQueue).toHaveBeenCalledWith('q1');
  });
});
