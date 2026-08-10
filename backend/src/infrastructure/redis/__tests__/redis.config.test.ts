import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildIORedisOptions,
  isTlsRedisUrl,
  loadRedisConfig,
} from '../redis.config';

describe('loadRedisConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('disables when REDIS_URL is missing', () => {
    vi.stubEnv('REDIS_URL', '');
    vi.stubEnv('NOTIFICATION_QUEUE_ENABLED', 'true');
    const config = loadRedisConfig();
    expect(config.enabled).toBe(false);
  });

  it('enables when REDIS_URL is set', () => {
    vi.stubEnv('REDIS_URL', 'rediss://default:secret@upstash.example:6379');
    vi.stubEnv('NOTIFICATION_QUEUE_ENABLED', 'true');
    const config = loadRedisConfig();
    expect(config.enabled).toBe(true);
    expect(config.url).toContain('rediss://');
  });

  it('respects NOTIFICATION_QUEUE_ENABLED=false', () => {
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
    vi.stubEnv('NOTIFICATION_QUEUE_ENABLED', 'false');
    expect(loadRedisConfig().enabled).toBe(false);
  });
});

describe('isTlsRedisUrl', () => {
  it('detects Upstash TLS URLs', () => {
    expect(isTlsRedisUrl('rediss://default:token@host.upstash.io:6379')).toBe(true);
    expect(isTlsRedisUrl('redis://localhost:6379')).toBe(false);
  });
});

describe('buildIORedisOptions', () => {
  it('enables TLS for rediss URLs', () => {
    const config = loadRedisConfig();
    const options = buildIORedisOptions({
      ...config,
      enabled: true,
      url: 'rediss://default:token@host.upstash.io:6379',
    });
    expect(options.tls).toEqual({ rejectUnauthorized: true });
    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it('uses exponential backoff in retryStrategy', () => {
    const config = loadRedisConfig();
    const options = buildIORedisOptions({
      ...config,
      enabled: true,
      url: 'redis://localhost:6379',
      reconnectBaseMs: 100,
      reconnectMaxMs: 1000,
      maxReconnectAttempts: 10,
    });
    expect(options.retryStrategy?.(1)).toBe(100);
    expect(options.retryStrategy?.(3)).toBe(400);
    expect(options.retryStrategy?.(99)).toBeNull();
  });
});
