export const NOTIFICATION_QUEUE_NAME = 'notifications';
export const NOTIFICATION_DLQ_NAME = 'notifications-dlq';

export const NOTIFICATION_JOB_SEND = 'send-notification';

export type NotificationQueueDriver = 'redis' | 'postgres';

export function resolveNotificationQueueDriver(): NotificationQueueDriver {
  const raw = (process.env.NOTIFICATION_QUEUE_DRIVER ?? 'redis')
    .trim()
    .toLowerCase();
  if (raw === 'postgres' || raw === 'postgresql' || raw === 'pg') {
    return 'postgres';
  }
  return 'redis';
}

export function notificationQueueConfig() {
  const driver = resolveNotificationQueueDriver();
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
  const enabled =
    process.env.NOTIFICATION_QUEUE_ENABLED !== 'false' &&
    (driver === 'postgres' || redisConfigured);

  return {
    driver,
    enabled,
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 5),
    maxAttempts: Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5),
    backoffDelayMs: Number(process.env.NOTIFICATION_BACKOFF_MS ?? 5000),
    removeOnComplete: Number(process.env.NOTIFICATION_REMOVE_ON_COMPLETE ?? 1000),
    removeOnFail: Number(process.env.NOTIFICATION_REMOVE_ON_FAIL ?? 5000),
    /** How often the postgres worker polls for claimable jobs. */
    pollIntervalMs: Number(process.env.NOTIFICATION_PG_POLL_INTERVAL_MS ?? 1000),
    /** Lease duration before a PROCESSING job can be reclaimed. */
    leaseMs: Number(
      process.env.NOTIFICATION_PG_LEASE_MS ??
        process.env.NOTIFICATION_STALE_PROCESSING_MS ??
        5 * 60_000,
    ),
    /** Max jobs claimed per poll cycle (bounded by concurrency). */
    claimBatchSize: Number(process.env.NOTIFICATION_PG_CLAIM_BATCH ?? 10),
  };
}
