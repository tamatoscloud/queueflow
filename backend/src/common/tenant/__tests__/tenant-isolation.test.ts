import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessContext } from '../../context/business-context';
import { TenantScopeService } from '../tenant-scope.service';
import { QueueService } from '../../../modules/queue/queue.service';
import { BranchService } from '../../../modules/branch/branch.service';
import { CustomerService } from '../../../modules/customer/customer.service';
import { FeedbackService } from '../../../modules/feedback/feedback.service';
import { ReportsService } from '../../../modules/reports/reports.service';
import { QueueOperationsService } from '../../../modules/queue-operations/queue-operations.service';
import { QueueSnapshotEnrichmentService } from '../../../modules/queue-operations/queue-snapshot-enrichment.service';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/auth.interfaces';
import type { QueueEngineService } from '../../../queue-engine';

const BIZ_A = '00000000-0000-4000-8000-000000000001';
const BIZ_B = '00000000-0000-4000-8000-000000000002';
const QUEUE_B = '00000000-0000-4000-8000-000000000010';
const BRANCH_B = '00000000-0000-4000-8000-000000000020';
const CUSTOMER_B = '00000000-0000-4000-8000-000000000030';
const ENTRY_B = '00000000-0000-4000-8000-000000000040';
const FEEDBACK_B = '00000000-0000-4000-8000-000000000050';

function tenantUser(businessId: string): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'staff@example.com',
    fullName: 'Staff',
    businessId,
    sessionId: 'sess-1',
    roles: ['OWNER'],
    permissions: [],
    branchIds: null,
    isPlatformAdmin: false,
  };
}

function platformAdmin(): AuthenticatedUser {
  return {
    id: 'admin-1',
    email: 'admin@queueflow.app',
    fullName: 'Admin',
    businessId: null,
    sessionId: 'sess-admin',
    roles: ['PLATFORM_ADMIN'],
    permissions: [],
    branchIds: null,
    isPlatformAdmin: true,
  };
}

function createRealtimeCredentialsMock() {
  return {
    issueEntryTrackingToken: vi.fn().mockReturnValue('tracking-token'),
    issueQueueDisplayToken: vi.fn().mockReturnValue('display-token'),
    verifyEntryTrackingToken: vi.fn(),
    verifyQueueDisplayToken: vi.fn(),
  };
}

function createTenantScope(prisma: Record<string, unknown>, user: AuthenticatedUser) {
  const businessContext = new BusinessContext();
  businessContext.setUser(user);
  const tenantScope = new TenantScopeService(
    businessContext,
    prisma as never,
  );
  return { businessContext, tenantScope };
}

describe('Tenant isolation (Wave 1A)', () => {
  describe('TenantScopeService resource guards', () => {
    let prisma: {
      queue: { findFirst: ReturnType<typeof vi.fn> };
      queueEntry: { findFirst: ReturnType<typeof vi.fn> };
      branch: { findFirst: ReturnType<typeof vi.fn> };
      customer: { findFirst: ReturnType<typeof vi.fn> };
      feedback: { findFirst: ReturnType<typeof vi.fn> };
    };
    let tenantScope: TenantScopeService;

    beforeEach(() => {
      prisma = {
        queue: { findFirst: vi.fn() },
        queueEntry: { findFirst: vi.fn() },
        branch: { findFirst: vi.fn() },
        customer: { findFirst: vi.fn() },
        feedback: { findFirst: vi.fn() },
      };
      ({ tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A)));
    });

    it('requireQueue denies cross-tenant queue access with 403', async () => {
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(tenantScope.requireQueue(QUEUE_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('requireQueue allows same-business queue access', async () => {
      const row = { id: QUEUE_B, businessId: BIZ_A, deletedAt: null };
      prisma.queue.findFirst.mockResolvedValue(row);
      await expect(tenantScope.requireQueue(QUEUE_B)).resolves.toEqual(row);
    });

    it('requireQueueEntry denies cross-tenant entry access', async () => {
      prisma.queueEntry.findFirst.mockResolvedValue({
        id: ENTRY_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(tenantScope.requireQueueEntry(ENTRY_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('requireBranch denies cross-tenant branch access', async () => {
      prisma.branch.findFirst.mockResolvedValue({
        id: BRANCH_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(tenantScope.requireBranch(BRANCH_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('requireCustomer denies cross-tenant customer access', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: CUSTOMER_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(tenantScope.requireCustomer(CUSTOMER_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('requireFeedback denies cross-tenant feedback access', async () => {
      prisma.feedback.findFirst.mockResolvedValue({
        id: FEEDBACK_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(tenantScope.requireFeedback(FEEDBACK_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('platform admin can access any tenant resource', async () => {
      const { tenantScope: adminScope } = createTenantScope(
        prisma,
        platformAdmin(),
      );
      prisma.queue.findFirst.mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      await expect(adminScope.requireQueue(QUEUE_B)).resolves.toBeTruthy();
    });
  });

  describe('QueueService', () => {
    let service: QueueService;
    let prisma: {
      branch: { findFirst: ReturnType<typeof vi.fn> };
      queue: {
        update: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
    let engine: { openQueue: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      prisma = {
        branch: { findFirst: vi.fn() },
        queue: {
          update: vi.fn(),
          count: vi.fn(),
          findMany: vi.fn(),
        },
        $transaction: vi.fn(),
      };
      engine = {
        openQueue: vi.fn().mockResolvedValue({ toProps: () => ({ id: QUEUE_B }) }),
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      service = new QueueService(
        prisma as never,
        tenantScope,
        createRealtimeCredentialsMock() as never,
        engine as unknown as QueueEngineService,
      );
    });

    it('denies read of another business queue', async () => {
      const findFirst = vi.fn().mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      const { tenantScope } = createTenantScope(
        { queue: { findFirst } } as never,
        tenantUser(BIZ_A),
      );
      const svc = new QueueService(
        { queue: { findFirst } } as never,
        tenantScope,
        createRealtimeCredentialsMock() as never,
        engine as unknown as QueueEngineService,
      );
      await expect(svc.get(QUEUE_B)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('denies modify of another business queue', async () => {
      const findFirst = vi.fn().mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_B,
        deletedAt: null,
      });
      const { tenantScope } = createTenantScope(
        { queue: { findFirst } } as never,
        tenantUser(BIZ_A),
      );
      const svc = new QueueService(
        { queue: { findFirst, update: vi.fn() } } as never,
        tenantScope,
        createRealtimeCredentialsMock() as never,
        engine as unknown as QueueEngineService,
      );
      await expect(svc.update(QUEUE_B, { name: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows same-business queue open', async () => {
      const findFirst = vi.fn().mockResolvedValue({
        id: QUEUE_B,
        businessId: BIZ_A,
        deletedAt: null,
      });
      const { tenantScope } = createTenantScope(
        { queue: { findFirst } } as never,
        tenantUser(BIZ_A),
      );
      const svc = new QueueService(
        { queue: { findFirst } } as never,
        tenantScope,
        createRealtimeCredentialsMock() as never,
        engine as unknown as QueueEngineService,
      );
      await expect(svc.open(QUEUE_B)).resolves.toEqual({ id: QUEUE_B });
    });
  });

  describe('BranchService', () => {
    it('denies get of another business branch', async () => {
      const repository = {
        findById: vi.fn(),
        findMany: vi.fn(),
        findBusiness: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
      };
      const prisma = {
        branch: {
          findFirst: vi.fn().mockResolvedValue({
            id: BRANCH_B,
            businessId: BIZ_B,
            deletedAt: null,
          }),
        },
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new BranchService(repository as never, tenantScope);
      await expect(service.get(BRANCH_B)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows same-business branch get', async () => {
      const row = { id: BRANCH_B, businessId: BIZ_A, deletedAt: null };
      const prisma = {
        branch: { findFirst: vi.fn().mockResolvedValue(row) },
      };
      const repository = {
        findById: vi.fn(),
        findMany: vi.fn(),
        findBusiness: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new BranchService(repository as never, tenantScope);
      await expect(service.get(BRANCH_B)).resolves.toEqual(row);
    });
  });

  describe('CustomerService', () => {
    it('denies cross-tenant customer read', async () => {
      const prisma = {
        customer: {
          findFirst: vi.fn().mockResolvedValue({
            id: CUSTOMER_B,
            businessId: BIZ_B,
            fullName: 'Other',
            phone: '+923009999999',
            deletedAt: null,
          }),
        },
      };
      const repository = {
        findByBusinessAndPhone: vi.fn(),
        findActiveEntries: vi.fn(),
        findHistory: vi.fn(),
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new CustomerService(repository as never, tenantScope);
      await expect(
        service.get(CUSTOMER_B, { businessId: BIZ_A }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows same-business customer read', async () => {
      const customer = {
        id: CUSTOMER_B,
        businessId: BIZ_A,
        fullName: 'Ali',
        phone: '+923001111111',
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const prisma = {
        customer: { findFirst: vi.fn().mockResolvedValue(customer) },
      };
      const repository = {
        findByBusinessAndPhone: vi.fn(),
        findActiveEntries: vi.fn(),
        findHistory: vi.fn(),
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new CustomerService(repository as never, tenantScope);
      const result = await service.get(CUSTOMER_B, { businessId: BIZ_A });
      expect(result.id).toBe(CUSTOMER_B);
    });
  });

  describe('FeedbackService', () => {
    it('denies cross-tenant feedback get', async () => {
      const prisma = {
        feedback: {
          findFirst: vi.fn().mockResolvedValue({
            id: FEEDBACK_B,
            businessId: BIZ_B,
            deletedAt: null,
          }),
        },
        $transaction: vi.fn(),
      };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new FeedbackService(prisma as never, tenantScope);
      await expect(service.get(FEEDBACK_B)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('ReportsService', () => {
    it('denies cross-tenant queue metrics', async () => {
      const prisma = {
        queue: {
          findFirst: vi.fn().mockResolvedValue({
            id: QUEUE_B,
            businessId: BIZ_B,
            deletedAt: null,
          }),
        },
      };
      const engine = {
        calculateQueueMetrics: vi.fn(),
        estimateWaitTime: vi.fn(),
        getLiveQueueSnapshot: vi.fn(),
      };
      const repository = { aggregateDailySummary: vi.fn() };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new ReportsService(
        engine as unknown as QueueEngineService,
        repository as never,
        tenantScope,
      );
      await expect(service.metrics(QUEUE_B)).rejects.toBeInstanceOf(ForbiddenException);
      expect(engine.calculateQueueMetrics).not.toHaveBeenCalled();
    });

    it('allows same-business reports', async () => {
      const prisma = {
        queue: {
          findFirst: vi.fn().mockResolvedValue({
            id: QUEUE_B,
            businessId: BIZ_A,
            deletedAt: null,
          }),
        },
      };
      const engine = {
        calculateQueueMetrics: vi.fn().mockResolvedValue({ waiting: 2 }),
        estimateWaitTime: vi.fn(),
        getLiveQueueSnapshot: vi.fn(),
      };
      const repository = { aggregateDailySummary: vi.fn() };
      const { tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A));
      const service = new ReportsService(
        engine as unknown as QueueEngineService,
        repository as never,
        tenantScope,
      );
      await expect(service.metrics(QUEUE_B)).resolves.toEqual({ waiting: 2 });
    });
  });

  describe('QueueOperationsService (staff endpoints)', () => {
    let engine: Record<string, ReturnType<typeof vi.fn>>;
    let tenantScope: TenantScopeService;

    beforeEach(() => {
      engine = {
        walkInCustomer: vi.fn().mockResolvedValue({ entryId: 'e1' }),
        callNextCustomer: vi.fn().mockResolvedValue({
          toProps: () => ({ id: ENTRY_B, status: 'CALLED' }),
        }),
        holdCustomer: vi.fn().mockResolvedValue({
          toProps: () => ({ id: ENTRY_B }),
        }),
        joinQueue: vi.fn(),
        getLiveQueueSnapshot: vi.fn(),
        calculateQueueMetrics: vi.fn(),
        estimateWaitTime: vi.fn(),
      };
      const prisma = {
        queue: {
          findFirst: vi.fn().mockResolvedValue({
            id: QUEUE_B,
            businessId: BIZ_B,
            deletedAt: null,
          }),
        },
        queueEntry: {
          findFirst: vi.fn().mockResolvedValue({
            id: ENTRY_B,
            businessId: BIZ_B,
            deletedAt: null,
          }),
        },
      };
      ({ tenantScope } = createTenantScope(prisma, tenantUser(BIZ_A)));
    });

    it('denies staff call-next on another business queue', async () => {
      const service = new QueueOperationsService(
        engine as unknown as QueueEngineService,
        new QueueSnapshotEnrichmentService(),
        tenantScope,
        createRealtimeCredentialsMock() as never,
      );
      await expect(service.callNext(QUEUE_B)).rejects.toBeInstanceOf(ForbiddenException);
      expect(engine.callNextCustomer).not.toHaveBeenCalled();
    });

    it('denies staff hold on another business entry', async () => {
      const service = new QueueOperationsService(
        engine as unknown as QueueEngineService,
        new QueueSnapshotEnrichmentService(),
        tenantScope,
        createRealtimeCredentialsMock() as never,
      );
      await expect(service.hold(ENTRY_B)).rejects.toBeInstanceOf(ForbiddenException);
      expect(engine.holdCustomer).not.toHaveBeenCalled();
    });

    it('public join does not require tenant scope', async () => {
      engine.joinQueue = vi.fn().mockResolvedValue({ entryId: 'e1' });
      const noopScope = {
        requireQueue: vi.fn().mockRejectedValue(new Error('should not be called')),
        requireQueueEntry: vi.fn(),
        resolveRequiredBusinessId: vi.fn(),
        resolveOptionalListBusinessId: vi.fn(),
        requireBranch: vi.fn(),
        requireCustomer: vi.fn(),
        requireFeedback: vi.fn(),
      };
      const service = new QueueOperationsService(
        engine as unknown as QueueEngineService,
        new QueueSnapshotEnrichmentService(),
        noopScope as never,
        createRealtimeCredentialsMock() as never,
      );
      await service.join(QUEUE_B, {
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: 'SMS' as never,
      });
      expect(noopScope.requireQueue).not.toHaveBeenCalled();
      expect(engine.joinQueue).toHaveBeenCalled();
    });
  });
});
