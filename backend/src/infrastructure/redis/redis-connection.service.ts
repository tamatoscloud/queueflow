import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import IORedis, { type Redis } from 'ioredis';
import {
  buildIORedisOptions,
  loadRedisConfig,
  type RedisConfig,
} from './redis.config';

export type RedisHealthStatus = {
  enabled: boolean;
  status: 'up' | 'down' | 'disabled';
  latencyMs?: number;
  lastError?: string;
  lastCheckedAt?: string;
};

/**
 * Manages Redis connections for BullMQ with TLS support, health checks,
 * and exponential-backoff reconnect. All configuration comes from env vars.
 */
@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionService.name);
  readonly config: RedisConfig = loadRedisConfig();
  private healthProbe: Redis | null = null;
  private lastHealth: RedisHealthStatus = {
    enabled: this.config.enabled,
    status: this.config.enabled ? 'down' : 'disabled',
  };

  /** Bounded probe so Redis DNS/connect failure cannot block HTTP startup. */
  private readonly healthProbeTimeoutMs = Number(
    process.env.REDIS_HEALTH_PROBE_TIMEOUT_MS ?? 3000,
  );

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn(
        'Redis disabled — set REDIS_URL to enable notification queue (NOTIFICATION_QUEUE_ENABLED=false to opt out)',
      );
      this.lastHealth = { enabled: false, status: 'disabled' };
      return;
    }
    await this.refreshHealth();
    if (this.lastHealth.status === 'up') {
      this.logger.log('Redis connection verified');
    } else {
      this.logger.warn(
        `Redis not reachable at startup (${this.lastHealth.lastError}) — HTTP server will still start`,
      );
    }
  }

  /** Creates a dedicated connection (BullMQ queue/worker each need their own). */
  createConnection(label = 'bullmq'): Redis {
    if (!this.config.enabled) {
      throw new Error('Redis is not configured (REDIS_URL missing or queue disabled)');
    }
    const options = buildIORedisOptions(this.config);
    const client = new IORedis(this.config.url, options);
    this.attachLifecycleLogging(client, label);
    return client;
  }

  /**
   * Health-only client: short timeouts, no retry, never blocks bootstrap.
   * BullMQ connections from createConnection() are unchanged.
   */
  private createHealthProbe(): Redis {
    const options = buildIORedisOptions(this.config);
    const probe = new IORedis(this.config.url, {
      ...options,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: this.healthProbeTimeoutMs,
      commandTimeout: this.healthProbeTimeoutMs,
      retryStrategy: () => null,
    });
    probe.on('error', () => {
      /* ping/connect timeout records status; avoid unhandled error events */
    });
    return probe;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${ms}ms`)),
            ms,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private discardHealthProbe(): void {
    if (!this.healthProbe) return;
    this.healthProbe.disconnect();
    this.healthProbe = null;
  }

  async refreshHealth(): Promise<RedisHealthStatus> {
    if (!this.config.enabled) {
      this.lastHealth = { enabled: false, status: 'disabled' };
      return this.lastHealth;
    }

    const started = Date.now();
    try {
      if (!this.healthProbe) {
        this.healthProbe = this.createHealthProbe();
      }
      if (this.healthProbe.status !== 'ready') {
        await this.withTimeout(
          this.healthProbe.connect(),
          this.healthProbeTimeoutMs,
          'Redis connect',
        );
      }
      const pong = await this.withTimeout(
        this.healthProbe.ping(),
        this.healthProbeTimeoutMs,
        'Redis ping',
      );
      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING response: ${pong}`);
      }
      this.lastHealth = {
        enabled: true,
        status: 'up',
        latencyMs: Date.now() - started,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.discardHealthProbe();
      this.lastHealth = {
        enabled: true,
        status: 'down',
        lastError: String(err),
        lastCheckedAt: new Date().toISOString(),
      };
    }
    return this.lastHealth;
  }

  getHealth(): RedisHealthStatus {
    return this.lastHealth;
  }

  isAvailable(): boolean {
    return this.config.enabled && this.lastHealth.status === 'up';
  }

  private attachLifecycleLogging(client: Redis, label: string): void {
    client.on('connect', () => {
      this.logger.log(`Redis [${label}] connected`);
      void this.refreshHealth();
    });
    client.on('ready', () => {
      this.logger.debug(`Redis [${label}] ready`);
    });
    client.on('error', (err) => {
      this.logger.warn(`Redis [${label}] error: ${String(err)}`);
      void this.refreshHealth();
    });
    client.on('close', () => {
      this.logger.warn(`Redis [${label}] connection closed`);
    });
    client.on('reconnecting', (delayMs: number) => {
      this.logger.log(`Redis [${label}] reconnecting in ${delayMs}ms`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.healthProbe) {
      await this.healthProbe.quit().catch(() => undefined);
      this.healthProbe = null;
    }
  }
}
