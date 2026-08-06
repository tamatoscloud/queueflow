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
        `Redis not reachable at startup (${this.lastHealth.lastError}) — will retry on reconnect`,
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

  async refreshHealth(): Promise<RedisHealthStatus> {
    if (!this.config.enabled) {
      this.lastHealth = { enabled: false, status: 'disabled' };
      return this.lastHealth;
    }

    const started = Date.now();
    try {
      const probe = this.healthProbe ?? this.createConnection('health-probe');
      this.healthProbe = probe;
      const pong = await probe.ping();
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
