import 'reflect-metadata';
import { validateEnvironment } from './config/env.validation';
import { initSentry } from './instrumentation/sentry';

validateEnvironment();
initSentry();

import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  RequestMethod,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RedisIoAdapter } from './infrastructure/realtime/redis-io.adapter';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { corsOriginDelegate } from './common/http/cors.util';
import { getAppEnvironment } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');
  const env = getAppEnvironment();

  // Railway (and most PaaS) terminate TLS at an edge proxy. Without this,
  // req.ip is the proxy's address and every client shares one rate-limit
  // bucket. TRUST_PROXY_HOPS = number of proxies in front of the app.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  if (RedisIoAdapter.isEnabled()) {
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connect();
    app.useWebSocketAdapter(redisAdapter);
  } else {
    app.useWebSocketAdapter(new IoAdapter(app));
  }

  app.use(
    helmet({
      contentSecurityPolicy: env === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.enableCors({
    origin: corsOriginDelegate,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-tracking-token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseEnvelopeInterceptor(),
  );

  app.enableShutdownHooks();

  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('QueueFlow API')
      .setDescription(
        'REST application layer for QueueFlow with JWT auth and RBAC.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'x-request-id', in: 'header' },
        'request-id',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`QueueFlow API listening on 0.0.0.0:${port}`);
  if (env !== 'production') {
    logger.log(`OpenAPI docs at http://localhost:${port}/docs`);
  }
  logger.log(`Socket.IO realtime at ws://localhost:${port}/realtime`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error('QueueFlow bootstrap failed:', message);
  process.exit(1);
});
