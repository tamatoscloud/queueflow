import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import type { ServerOptions } from 'socket.io';
import { buildIORedisOptions, loadRedisConfig } from '../redis/redis.config';

/**
 * Socket.IO adapter that relays room broadcasts through Redis pub/sub, so a
 * queue event raised on one API replica reaches guests and TVs connected to
 * any replica. Enabled with `SOCKET_IO_REDIS_ADAPTER=true` + `REDIS_URL`;
 * otherwise the default in-memory adapter is used (single instance).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  static isEnabled(): boolean {
    return (
      process.env.SOCKET_IO_REDIS_ADAPTER === 'true' &&
      (process.env.REDIS_URL?.trim().length ?? 0) > 0
    );
  }

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL!.trim();
    const options = {
      ...buildIORedisOptions({ ...loadRedisConfig(), url }),
      maxRetriesPerRequest: null,
    };
    const pubClient = new IORedis(url, options);
    const subClient = pubClient.duplicate();
    for (const [label, client] of [
      ['pub', pubClient],
      ['sub', subClient],
    ] as const) {
      client.on('error', (err) =>
        this.redisLogger.warn(`Socket.IO Redis ${label} error: ${err.message}`),
      );
    }
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.redisLogger.log('Socket.IO rooms are shared across replicas via Redis');
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
