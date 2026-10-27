import { Logger } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import IORedis from 'ioredis';
import { buildIORedisOptions, loadRedisConfig } from '../../infrastructure/redis/redis.config';

/** Default bucket: 120 requests per minute per client IP. */
export const DEFAULT_THROTTLE = { ttl: 60_000, limit: 120 } as const;

/**
 * `THROTTLE_STORAGE=redis` shares rate-limit counters across API replicas and
 * keeps them through deploys. Default `memory` adds no per-request Redis round
 * trip, which is right while the API runs as a single instance.
 */
export function resolveThrottleStorage(): 'redis' | 'memory' {
  return (process.env.THROTTLE_STORAGE ?? 'memory').trim().toLowerCase() === 'redis'
    ? 'redis'
    : 'memory';
}

export function buildThrottlerOptions(): ThrottlerModuleOptions {
  const throttlers = [{ ...DEFAULT_THROTTLE }];
  if (resolveThrottleStorage() !== 'redis') {
    return { throttlers };
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    new Logger('Throttler').warn(
      'THROTTLE_STORAGE=redis but REDIS_URL is empty — using in-memory rate limits',
    );
    return { throttlers };
  }

  const config = { ...loadRedisConfig(), url };
  const client = new IORedis(url, {
    ...buildIORedisOptions(config),
    // Rate limiting must never hang a request: fail fast instead of queueing.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  client.on('error', (err) =>
    new Logger('Throttler').warn(`Redis rate-limit store error: ${err.message}`),
  );
  return { throttlers, storage: new ThrottlerStorageRedisService(client) };
}
