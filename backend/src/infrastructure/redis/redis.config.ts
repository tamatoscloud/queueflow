/**
 * Redis connection settings derived solely from environment variables.
 * Supports managed providers (e.g. Upstash) via `rediss://` TLS URLs.
 */
export interface RedisConfig {
  /** When false, notification queue is disabled (no REDIS_URL or explicit opt-out). */
  enabled: boolean;
  url: string;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  maxReconnectAttempts: number;
  /** BullMQ requires null; exposed for connection factory. */
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
}

export function loadRedisConfig(): RedisConfig {
  const url = process.env.REDIS_URL?.trim() ?? '';
  const queueExplicitlyDisabled = process.env.NOTIFICATION_QUEUE_ENABLED === 'false';
  const enabled = !queueExplicitlyDisabled && url.length > 0;

  return {
    enabled,
    url,
    connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 10_000),
    commandTimeoutMs: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? 15_000),
    reconnectBaseMs: Number(process.env.REDIS_RECONNECT_BASE_MS ?? 200),
    reconnectMaxMs: Number(process.env.REDIS_RECONNECT_MAX_MS ?? 30_000),
    maxReconnectAttempts: Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS ?? 50),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  };
}

export function isTlsRedisUrl(url: string): boolean {
  return url.startsWith('rediss://');
}

export function buildIORedisOptions(config: RedisConfig): import('ioredis').RedisOptions {
  const tls = isTlsRedisUrl(config.url) ? { rejectUnauthorized: true } : undefined;

  return {
    connectTimeout: config.connectTimeoutMs,
    commandTimeout: config.commandTimeoutMs,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: config.lazyConnect,
    tls,
    retryStrategy: (attempt) => {
      if (attempt > config.maxReconnectAttempts) {
        return null;
      }
      const delay = Math.min(
        config.reconnectBaseMs * 2 ** Math.max(0, attempt - 1),
        config.reconnectMaxMs,
      );
      return delay;
    },
    reconnectOnError: (err) => {
      const message = err.message.toLowerCase();
      return (
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('readonly') ||
        message.includes('socket closed')
      );
    },
  };
}
