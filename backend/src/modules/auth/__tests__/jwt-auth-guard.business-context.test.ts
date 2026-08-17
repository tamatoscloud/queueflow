import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { IsUUID } from 'class-validator';
import request from 'supertest';
import { BusinessContext } from '../../../common/context/business-context';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from '../../../common/middleware/request-id.middleware';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantScopeService } from '../../../common/tenant/tenant-scope.service';
import { Permission } from '../constants/roles-permissions';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/auth.guards';
import type { JwtAccessPayload } from '../interfaces/auth.interfaces';
import { JwtStrategy } from '../strategies/jwt.strategy';

const TEST_SECRET = 'jwt-auth-guard-business-context-test-secret';
const BIZ_A = '00000000-0000-4000-8000-0000000000aa';
const BIZ_B = '00000000-0000-4000-8000-0000000000bb';
const QUEUE_A = '00000000-0000-4000-8000-0000000000a1';
const QUEUE_B = '00000000-0000-4000-8000-0000000000b1';
const OWNER_PERMISSIONS = [
  Permission.BUSINESS_MANAGE,
  Permission.BRANCH_MANAGE,
  Permission.QUEUE_MANAGE,
  Permission.QUEUE_OPERATE,
];

class CreateBranchProbeDto {
  @IsUUID('4')
  businessId!: string;
}

@Controller({ path: 'branches', version: '1' })
@RequirePermissions(Permission.BRANCH_MANAGE)
class TenantBranchProbeController {
  constructor(
    @Inject(TenantScopeService) private readonly tenantScope: TenantScopeService,
    @Inject(BusinessContext) private readonly businessContext: BusinessContext,
  ) {}

  @Post()
  create(@Body() body: CreateBranchProbeDto) {
    const businessId = this.tenantScope.resolveRequiredBusinessId(body.businessId);
    return {
      initialized: true,
      businessId,
      actorBusinessId: this.businessContext.businessId,
      userId: this.businessContext.userId,
      sameInstance:
        this.tenantScope.resolveRequiredBusinessId() === this.businessContext.businessId,
    };
  }

  @Get()
  list() {
    return {
      initialized: true,
      businessId: this.tenantScope.resolveRequiredBusinessId(),
      userId: this.businessContext.userId,
      isPlatformAdmin: this.businessContext.isPlatformAdmin(),
    };
  }
}

@Controller({ path: 'queues', version: '1' })
@RequirePermissions(Permission.QUEUE_MANAGE)
class TenantQueueProbeController {
  constructor(
    @Inject(TenantScopeService) private readonly tenantScope: TenantScopeService,
    @Inject(BusinessContext) private readonly businessContext: BusinessContext,
  ) {}

  @Get()
  list() {
    return {
      initialized: true,
      businessId: this.tenantScope.resolveRequiredBusinessId(),
      userId: this.businessContext.userId,
    };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const queue = await this.tenantScope.requireQueue(id);
    return {
      initialized: true,
      queueId: queue.id,
      businessId: queue.businessId,
      actorBusinessId: this.businessContext.businessId,
    };
  }
}

function ownerPayload(
  overrides: Partial<JwtAccessPayload> = {},
): Omit<JwtAccessPayload, 'type'> {
  return {
    sub: 'owner-a',
    email: 'owner-a@example.com',
    businessId: BIZ_A,
    sessionId: 'sess-a',
    roles: ['OWNER'],
    permissions: OWNER_PERMISSIONS,
    branchIds: null,
    ...overrides,
  };
}

describe('JwtAuthGuard request-scoped BusinessContext', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: {
    queue: { findFirst: ReturnType<typeof vi.fn> };
    queueEntry: { findFirst: ReturnType<typeof vi.fn> };
    branch: { findFirst: ReturnType<typeof vi.fn> };
    customer: { findFirst: ReturnType<typeof vi.fn> };
    feedback: { findFirst: ReturnType<typeof vi.fn> };
  };
  let validateSession: ReturnType<typeof vi.fn>;

  const previousSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    prisma = {
      queue: { findFirst: vi.fn() },
      queueEntry: { findFirst: vi.fn() },
      branch: { findFirst: vi.fn() },
      customer: { findFirst: vi.fn() },
      feedback: { findFirst: vi.fn() },
    };
    validateSession = vi.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [TenantBranchProbeController, TenantQueueProbeController],
      providers: [
        BusinessContext,
        TenantScopeService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: AuthService, useValue: { validateSession } },
        { provide: PrismaService, useValue: prisma },
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
    jwt = moduleRef.get(JwtService);
  }, 30_000);

  afterAll(async () => {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
    if (app) {
      await app.close();
    }
  });

  function bearer(payload: Omit<JwtAccessPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'access' });
  }

  it('initializes BusinessContext for an OWNER branch create (same instance as TenantScopeService)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`)
      .send({ businessId: BIZ_A })
      .expect(201);

    expect(res.body.data).toMatchObject({
      initialized: true,
      businessId: BIZ_A,
      actorBusinessId: BIZ_A,
      userId: 'owner-a',
      sameInstance: true,
    });
  });

  it('lets OWNER list tenant-scoped branches', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      initialized: true,
      businessId: BIZ_A,
      userId: 'owner-a',
      isPlatformAdmin: false,
    });
  });

  it('lets OWNER list tenant-scoped queues', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/queues')
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      initialized: true,
      businessId: BIZ_A,
      userId: 'owner-a',
    });
  });

  it('lets OWNER get a same-tenant queue', async () => {
    prisma.queue.findFirst.mockResolvedValueOnce({
      id: QUEUE_A,
      businessId: BIZ_A,
      deletedAt: null,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/queues/${QUEUE_A}`)
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      initialized: true,
      queueId: QUEUE_A,
      businessId: BIZ_A,
      actorBusinessId: BIZ_A,
    });
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/branches');
    expect(res.status).toBe(401);
  });

  it('returns 401 when JWT is invalid', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('forbids OWNER from creating a branch for another tenant', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`)
      .send({ businessId: BIZ_B });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/TENANT_ACCESS_DENIED/);
  });

  it('forbids OWNER from reading another tenant queue', async () => {
    prisma.queue.findFirst.mockResolvedValueOnce({
      id: QUEUE_B,
      businessId: BIZ_B,
      deletedAt: null,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/queues/${QUEUE_B}`)
      .set('Authorization', `Bearer ${bearer(ownerPayload())}`);

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/TENANT_ACCESS_DENIED/);
  });

  it('keeps PLATFORM_ADMIN off tenant branch/queue endpoints without branch:manage', async () => {
    const token = bearer({
      sub: 'admin-1',
      email: 'ops@queueflow.app',
      businessId: null,
      sessionId: 'sess-admin',
      roles: ['PLATFORM_ADMIN'],
      permissions: [Permission.PLATFORM_MANAGE_TENANTS],
      branchIds: null,
    });

    const branch = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ businessId: BIZ_A });
    const queues = await request(app.getHttpServer())
      .get('/api/v1/queues')
      .set('Authorization', `Bearer ${token}`);

    expect(branch.status).toBe(403);
    expect(queues.status).toBe(403);
  });

  it('does not leak BusinessContext between concurrent owner requests', async () => {
    const tokenA = bearer(ownerPayload());
    const tokenB = bearer(
      ownerPayload({
        sub: 'owner-b',
        email: 'owner-b@example.com',
        businessId: BIZ_B,
        sessionId: 'sess-b',
      }),
    );

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .get('/api/v1/branches')
        .set('Authorization', `Bearer ${tokenA}`),
      request(app.getHttpServer())
        .get('/api/v1/branches')
        .set('Authorization', `Bearer ${tokenB}`),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body.data).toMatchObject({
      businessId: BIZ_A,
      userId: 'owner-a',
    });
    expect(resB.body.data).toMatchObject({
      businessId: BIZ_B,
      userId: 'owner-b',
    });
  });
});
