import type { NotificationJobData } from '../domain/notification.types';

/** Minimal job shape shared by BullMQ and PostgreSQL drivers. */
export interface NotificationQueueJob {
  id?: string;
  data: NotificationJobData;
  attemptsMade: number;
}

export type NotificationJobProcessor = (
  job: NotificationQueueJob,
) => Promise<void>;

export interface EnqueueSendOptions {
  delayMs?: number;
  attempt?: number;
  force?: boolean;
}

export interface NotificationQueueHealthCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  dead?: number;
}

/**
 * Transport-agnostic notification delivery queue.
 * Drivers: redis (BullMQ) | postgres (SKIP LOCKED jobs table).
 */
export interface NotificationQueuePort {
  readonly isEnabled: boolean;
  enqueueSend(
    notificationId: string,
    options?: EnqueueSendOptions,
  ): Promise<void>;
  startWorker(processor: NotificationJobProcessor): void;
  isWorkerRunning(): boolean;
  getHealthCounts(): Promise<NotificationQueueHealthCounts>;
}

export const NOTIFICATION_QUEUE = Symbol('NOTIFICATION_QUEUE');

export class NotificationQueueUnavailableError extends Error {
  constructor(message = 'Notification queue is temporarily unavailable') {
    super(message);
    this.name = 'NotificationQueueUnavailableError';
  }
}
