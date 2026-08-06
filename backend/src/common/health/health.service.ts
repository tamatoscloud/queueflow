import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisConnectionService } from '../../infrastructure/redis/redis-connection.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { NotificationQueueService } from '../../infrastructure/notifications/queue/notification-queue.service';
import { getBuildMetadata } from '../../config/env.validation';
import * as os from 'node:os';

export type HealthCheckResult = {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  detail?: string;
  [key: string]: unknown;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionService,
    private readonly supabase: SupabaseService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  async getDetailedHealth() {
    const [database, redis, supabase, notificationQueue, notificationWorker, socketIo] =
      await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkSupabase(),
        this.checkNotificationQueue(),
        this.checkNotificationWorker(),
        Promise.resolve(this.checkSocketIo()),
      ]);

    const memory = this.checkMemory();
    const checks = {
      database,
      redis,
      supabase,
      socketIo,
      notificationQueue,
      notificationWorker,
      memory,
    };

    const anyDown = Object.values(checks).some((c) => c.status === 'down');
    const anyDegraded = Object.values(checks).some((c) => c.status === 'degraded');

    return {
      status: anyDown ? 'down' : anyDegraded ? 'degraded' : 'ok',
      service: 'queueflow-backend',
      ...getBuildMetadata(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - started };
    } catch (e) {
      return {
        status: 'down',
        latencyMs: Date.now() - started,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const health = await this.redis.refreshHealth();
    return {
      status: health.status === 'up' ? 'ok' : health.status === 'disabled' ? 'degraded' : 'down',
      latencyMs: health.latencyMs,
      enabled: health.enabled,
      detail: health.lastError,
    };
  }

  private async checkSupabase(): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const { error } = await this.supabase.admin.from('business').select('id').limit(1);
      if (error) {
        return { status: 'degraded', latencyMs: Date.now() - started, detail: error.message };
      }
      return { status: 'ok', latencyMs: Date.now() - started };
    } catch (e) {
      return {
        status: 'down',
        latencyMs: Date.now() - started,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private checkSocketIo(): HealthCheckResult {
    return { status: 'ok', namespace: '/realtime' };
  }

  private async checkNotificationQueue(): Promise<HealthCheckResult> {
    if (!this.notificationQueue.isEnabled) {
      return { status: 'degraded', enabled: false, detail: 'Queue disabled' };
    }
    try {
      const queue = this.notificationQueue.getQueue();
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      return { status: 'ok', enabled: true, counts };
    } catch (e) {
      return {
        status: 'down',
        enabled: true,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async checkNotificationWorker(): Promise<HealthCheckResult> {
    if (!this.notificationQueue.isEnabled) {
      return { status: 'degraded', running: false, detail: 'Worker disabled with queue' };
    }
    const running = this.notificationQueue.isWorkerRunning();
    return {
      status: running ? 'ok' : 'degraded',
      running,
    };
  }

  private checkMemory(): HealthCheckResult {
    const total = os.totalmem();
    const free = os.freemem();
    const usedPercent = ((total - free) / total) * 100;
    return {
      status: usedPercent > 95 ? 'degraded' : 'ok',
      totalMb: Math.round(total / 1024 / 1024),
      freeMb: Math.round(free / 1024 / 1024),
      usedPercent: Math.round(usedPercent),
    };
  }
}
