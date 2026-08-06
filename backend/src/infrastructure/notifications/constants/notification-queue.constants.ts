export const NOTIFICATION_QUEUE_NAME = 'notifications';
export const NOTIFICATION_DLQ_NAME = 'notifications-dlq';

export const NOTIFICATION_JOB_SEND = 'send-notification';

export function notificationQueueConfig() {
  const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
  const enabled =
    process.env.NOTIFICATION_QUEUE_ENABLED !== 'false' && redisConfigured;

  return {
    enabled,
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 5),
    maxAttempts: Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5),
    backoffDelayMs: Number(process.env.NOTIFICATION_BACKOFF_MS ?? 5000),
    removeOnComplete: Number(process.env.NOTIFICATION_REMOVE_ON_COMPLETE ?? 1000),
    removeOnFail: Number(process.env.NOTIFICATION_REMOVE_ON_FAIL ?? 5000),
  };
}
