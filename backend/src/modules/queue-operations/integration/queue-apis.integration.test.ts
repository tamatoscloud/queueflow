import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
  InMemoryCustomerRepository,
  InMemoryQueueEntryRepository,
  InMemoryQueueRepository,
  NotificationPreference,
  QueueEngineService,
} from '../../../queue-engine';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from '../../../common/middleware/request-id.middleware';

describe('Queue APIs (integration, in-memory engine)', () => {
  let app: INestApplication;
  let engine: QueueEngineService;
  let queueId: string;

  beforeAll(async () => {
    // Import controller/service directly with the in-memory engine module
    // (avoids pulling Prisma QueueEngineModule into the test).
    const moduleRef = await Test.createTestingModule({
      imports: [QueueEngineTestModule],
      controllers: [QueueOperationsController],
      providers: [
        QueueSnapshotEnrichmentService,
        {
          provide: QueueOperationsService,
          useFactory: (
            engine: QueueEngineService,
            enrichment: QueueSnapshotEnrichmentService,
          ) => new QueueOperationsService(engine, enrichment),
          inject: [QueueEngineService, QueueSnapshotEnrichmentService],
        },
      ],
    }).compile();

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

  it('POST join returns envelope with token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 2,
        notificationPreference: NotificationPreference.SMS,
        bypassOperatingHours: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.displayCode).toBe('A-001');
    expect(res.body.requestId).toBeTruthy();
  });

  it('GET snapshot after join', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.WHATSAPP,
        bypassOperatingHours: true,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/queues/${queueId}/snapshot`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.waitingCount).toBe(1);
  });

  it('call-next then complete', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({
        fullName: 'Ali',
        phone: '+923001111111',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
        bypassOperatingHours: true,
      })
      .expect(201);

    const called = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/call-next`)
      .expect(201);

    const entryId = called.body.data.id as string;
    expect(called.body.data.status).toBe('CALLED');

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/queue-entries/${entryId}/complete`)
      .expect(201);

    expect(completed.body.data.status).toBe('COMPLETED');
  });

  it('rejects invalid join body with validation error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/join`)
      .send({ fullName: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeTruthy();
  });

  it('POST walk-in returns envelope with token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/queues/${queueId}/walk-in`)
      .send({
        fullName: 'Walk-in Guest',
        phone: '+923009999999',
        partySize: 1,
        notificationPreference: NotificationPreference.SMS,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.displayCode).toBe('A-001');
  });

  it('GET metrics', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/queues/${queueId}/metrics`)
      .expect(200);
    expect(res.body.data.waitingCount).toBe(0);
  });
});
