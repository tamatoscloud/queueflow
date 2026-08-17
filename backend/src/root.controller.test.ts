import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Controller,
  Get,
  INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RootController } from './root.controller';

@Controller({ path: 'health', version: '1' })
class LiveProbeStubController {
  @Get('live')
  live() {
    return { status: 'ok', service: 'queueflow-backend' };
  }
}

function applyHttpConventions(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
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
}

describe('Root and liveness routing', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RootController, LiveProbeStubController],
    }).compile();

    app = moduleRef.createNestApplication();
    applyHttpConventions(app);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns enveloped service metadata', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: {
        service: 'queueflow-backend',
        status: 'ok',
        environment: expect.stringMatching(/^(development|staging|production)$/),
      },
    });
    expect(res.body).not.toHaveProperty('error');
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.data).not.toHaveProperty('gitSha');
    expect(res.body.data).not.toHaveProperty('DATABASE_URL');
    expect(JSON.stringify(res.body)).not.toMatch(/redis|supabase|secret|password/i);
  });

  it('GET /api/v1/health/live is still reachable after the root exclude', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'ok', service: 'queueflow-backend' },
    });
  });
});
