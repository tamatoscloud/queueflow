import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type ProbeInstance = {
  status: string;
  connect: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

const { instances, IORedisCtor, createProbeInstance } = vi.hoisted(() => {
  const instances: ProbeInstance[] = [];
  const createProbeInstance = (): ProbeInstance => {
    const instance: ProbeInstance = {
      status: 'wait',
      connect: vi.fn(),
      ping: vi.fn(),
      disconnect: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
      on: vi.fn(),
    };
    instances.push(instance);
    return instance;
  };
  return {
    instances,
    createProbeInstance,
    IORedisCtor: vi.fn(() => createProbeInstance()),
  };
});

vi.mock('ioredis', () => ({
  default: IORedisCtor,
}));

import { RedisConnectionService } from '../redis-connection.service';

describe('RedisConnectionService startup health probe', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    instances.length = 0;
    IORedisCtor.mockReset();
    IORedisCtor.mockImplementation(() => createProbeInstance());
    vi.stubEnv('REDIS_URL', 'redis://redis.railway.internal:6379');
    vi.stubEnv('REDIS_HEALTH_PROBE_TIMEOUT_MS', '200');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
  });

  it('records up when Redis ping succeeds', async () => {
    IORedisCtor.mockImplementation(() => {
      const instance = createProbeInstance();
      instance.connect.mockImplementation(async () => {
        instance.status = 'ready';
      });
      instance.ping.mockResolvedValue('PONG');
      return instance;
    });

    const service = new RedisConnectionService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getHealth().status).toBe('up');
    expect(service.getHealth().enabled).toBe(true);
    const firstCall = IORedisCtor.mock.calls[0] as unknown as [
      string,
      { lazyConnect?: boolean; maxRetriesPerRequest?: number | null },
    ];
    expect(firstCall[1]).toMatchObject({
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await service.onModuleDestroy();
    expect(instances[0]?.quit).toHaveBeenCalled();
  });

  it('records down when Redis connection fails and does not throw', async () => {
    IORedisCtor.mockImplementation(() => {
      const instance = createProbeInstance();
      instance.connect.mockRejectedValue(new Error('ECONNREFUSED'));
      return instance;
    });

    const service = new RedisConnectionService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getHealth().status).toBe('down');
    expect(service.getHealth().lastError).toContain('ECONNREFUSED');
    expect(instances[0]?.disconnect).toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('times out a hanging Redis connect without blocking module init', async () => {
    IORedisCtor.mockImplementation(() => {
      const instance = createProbeInstance();
      instance.connect.mockImplementation(() => new Promise(() => undefined));
      return instance;
    });

    const service = new RedisConnectionService();
    const started = Date.now();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(2000);
    expect(service.getHealth().status).toBe('down');
    expect(service.getHealth().lastError).toMatch(/timed out after 200ms/i);
    expect(instances[0]?.disconnect).toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('does not throw or block module initialization when Redis is unavailable', async () => {
    IORedisCtor.mockImplementation(() => {
      const instance = createProbeInstance();
      instance.connect.mockRejectedValue(new Error('ENOTFOUND redis.railway.internal'));
      return instance;
    });

    const service = new RedisConnectionService();
    const started = Date.now();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(2000);
    expect(service.getHealth().enabled).toBe(true);
    expect(service.getHealth().status).toBe('down');
    await service.onModuleDestroy();
  });
});
