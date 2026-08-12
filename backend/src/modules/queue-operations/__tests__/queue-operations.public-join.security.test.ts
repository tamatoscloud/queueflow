import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { QueueOperationsController } from '../queue-operations.controller';
import { QueueOperationsService } from '../queue-operations.service';
import { QueueSnapshotEnrichmentService } from '../queue-snapshot-enrichment.service';
import { QueueEngineTestModule } from '../../../testing/queue-engine-test.module';
import {
  AlwaysOpenOperatingHours,
  FixedClock,
  FixedWindowsOperatingHours,
  InMemoryCustomerRepository,
  InMemoryEventBus,
  InMemoryQueueEntryRepository,
  InMemoryQueueRepository,
  InMemoryTokenRepository,
  InMemoryUnitOfWork,
  NotificationPreference,
  OutsideOperatingHoursError,
  QueueEngineService,
} from '../../../queue-engine';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from '../../../common/middleware/request-id.middleware';
import { TenantScopeService } from '../../../common/tenant/tenant-scope.service';
import { RealtimeCredentialService } from '../../../infrastructure/realtime/services/realtime-credential.service';

const passThroughTenantScope = {
  requireQueue: vi.fn().mockResolvedValue({ id: 'q', businessId: 'biz' }),
  requireQueueEntry: vi.fn().mockResolvedValue({ id: 'e', businessId: 'biz' }),
  resolveRequiredBusinessId: (id?: string) => id ?? 'biz',
  resolveOptionalListBusinessId: () => undefined,
  requireBranch: vi.fn(),
  requireCustomer: vi.fn(),
  requireFeedback: vi.fn(),
} as unknown as TenantScopeService;

const validJoinBody = {
  fullName: 'Ali',
  phone: '+923001111111',
  partySize: 1,
  notificationPreference: NotificationPreference.SMS,
};

function createAppModule() {
  return Test.createTestingModule({
    imports: [QueueEngineTestModule],
    controllers: [QueueOperationsController],
    providers: [
      QueueSnapshotEnrichmentService,
      {
        provide: QueueOperationsService,
        useFactory: (
          engine: QueueEngineService,
          enrichment: QueueSnapshotEnrichmentService,
        ) =>
          new QueueOperationsService(
            engine,
            enrichment,
            passThroughTenantScope,
            {
              issueEntryTrackingToken: () => 'test-tracking-token',
              issueQueueDisplayToken: () => 'test-display-token',
              verifyEntryTrackingToken: () => true,
              verifyQueueDisplayToken: () => true,
            } as never,
          ),
        inject: [QueueEngineService, QueueSnapshotEnrichmentService],
      },
    ],
  });
}

describe('Public join security (Wave 1C-A)', () => {
  let app: INestApplication;
  let engine: QueueEngineService;
  let queueId: string;

  beforeAll(async () => {
    const moduleRef = await createAppModule().compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
    await app.init();
    engine = moduleRef.get(QueueEngineService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    app.get(InMemoryQueueRepository).clear();
    app.get(InMemoryQueueEntryRepository).clear();
    app.get(InMemoryCustomerRepository).clear();
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Walk-in',
      prefix: 'A',
    });
    queueId = queue.id;
  });

  it('allows normal public join', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send(validJoinBody)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.displayCode).toBe('A-001');
    expect(res.body.data.trackingToken).toBe('test-tracking-token');
  });

  it('strips isVip from public join body and creates a normal entry', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({ ...validJoinBody, isVip: true })
      .expect(201);

    const entryId = res.body.data.entryId as string;
    const entry = await app.get(InMemoryQueueEntryRepository).findById(entryId);
    expect(entry?.isVip).toBe(false);
  });

  it('strips priority from public join body and creates a normal entry', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({ ...validJoinBody, priority: 999 })
      .expect(201);

    const entryId = res.body.data.entryId as string;
    const entry = await app.get(InMemoryQueueEntryRepository).findById(entryId);
    expect(entry?.priority).toBe(0);
  });

  it('strips bypassOperatingHours from public join body', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({ ...validJoinBody, bypassOperatingHours: true })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('creates a non-VIP entry even when queue has priority enabled', async () => {
    app.get(InMemoryQueueRepository).clear();
    app.get(InMemoryQueueEntryRepository).clear();
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Priority Queue',
      prefix: 'P',
      priorityEnabled: true,
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queue.id}/join`)
      .send({
        ...validJoinBody,
        phone: '+923003333333',
      })
      .expect(201);

    const entryId = res.body.data.entryId as string;
    const entry = await app.get(InMemoryQueueEntryRepository).findById(entryId);
    expect(entry?.isVip).toBe(false);
    expect(entry?.priority).toBe(0);
  });

  it('rejects public join when queue is paused', async () => {
    await engine.pauseQueue(queueId);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send(validJoinBody)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('QUEUE_NOT_ACCEPTING');
  });

  it('rejects public join when queue is at capacity', async () => {
    app.get(InMemoryQueueRepository).clear();
    app.get(InMemoryQueueEntryRepository).clear();
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Small',
      prefix: 'S',
      maxCapacity: 1,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/queues/${queue.id}/join`)
      .send(validJoinBody)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queue.id}/join`)
      .send({ ...validJoinBody, phone: '+923009999999' })
      .expect(409);

    expect(res.body.error?.code).toBe('QUEUE_CAPACITY_EXCEEDED');
  });

  it('staff walk-in can still set VIP and priority', async () => {
    app.get(InMemoryQueueRepository).clear();
    app.get(InMemoryQueueEntryRepository).clear();
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'VIP Queue',
      prefix: 'V',
      priorityEnabled: true,
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queue.id}/walk-in`)
      .send({
        ...validJoinBody,
        isVip: true,
        priority: 50,
      })
      .expect(201);

    const entryId = res.body.data.entryId as string;
    const entry = await app.get(InMemoryQueueEntryRepository).findById(entryId);
    expect(entry?.isVip).toBe(true);
    expect(entry?.priority).toBeGreaterThan(0);
  });
});

describe('QueueOperationsService public join with engine (Wave 1C-A)', () => {
  const enrichment = new QueueSnapshotEnrichmentService();
  const realtimeCredentials = {
    issueEntryTrackingToken: () => 'tracking-token',
    issueQueueDisplayToken: () => 'display-token',
    verifyEntryTrackingToken: () => true,
    verifyQueueDisplayToken: () => true,
  } as unknown as RealtimeCredentialService;

  function createService(operatingHours = new AlwaysOpenOperatingHours()) {
    const clock = new FixedClock(new Date('2026-07-20T10:00:00.000Z'));
    const queues = new InMemoryQueueRepository();
    const entries = new InMemoryQueueEntryRepository();
    const customers = new InMemoryCustomerRepository();
    const tokens = new InMemoryTokenRepository();
    const eventBus = new InMemoryEventBus();
    const unitOfWork = new InMemoryUnitOfWork(queues, entries, customers, tokens);
    const engine = new QueueEngineService({
      queues,
      entries,
      customers,
      tokens,
      eventBus,
      clock,
      operatingHours,
      unitOfWork,
    });
    const service = new QueueOperationsService(
      engine,
      enrichment,
      passThroughTenantScope,
      realtimeCredentials,
    );
    return { engine, service, entries };
  }

  it('rejects public join outside operating hours', async () => {
    const hours = new FixedWindowsOperatingHours([
      { dayOfWeek: 0, openMinutes: 9 * 60, closeMinutes: 10 * 60, isClosed: false },
    ]);
    const { engine, service } = createService(hours);
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Hours',
      prefix: 'H',
    });

    await expect(
      service.join(queue.id, {
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      }),
    ).rejects.toBeInstanceOf(OutsideOperatingHoursError);
  });

  it('staff walk-in bypasses operating hours by default', async () => {
    const hours = new FixedWindowsOperatingHours([
      { dayOfWeek: 0, openMinutes: 9 * 60, closeMinutes: 10 * 60, isClosed: false },
    ]);
    const { engine, service } = createService(hours);
    const queue = await engine.createQueue({
      businessId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      name: 'Hours',
      prefix: 'H',
    });

    const result = await service.walkIn(queue.id, {
      fullName: 'Walk-in',
      phone: '+923001111111',
      partySize: 1,
      notificationPreference: NotificationPreference.SMS,
    });

    expect(result.displayCode).toBe('H-001');
  });
});
