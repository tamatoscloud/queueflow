import type {
  NotificationChannel,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';

export interface ScheduleNotificationBase {
  businessId: string;
  customerId: string;
  queueEntryId?: string | null;
  type: NotificationType;
  payload?: Record<string, unknown>;
  scheduledAt?: Date | null;
  createdBy?: string | null;
  eventKey?: string | null;
}

export interface CreateNotificationInput extends ScheduleNotificationBase {
  channel: NotificationChannel;
  idempotencyKey: string;
}

export interface IdempotentCreateResult {
  notification: { id: string; status: NotificationStatus };
  created: boolean;
}

export interface ClaimNotificationResult {
  claimed: boolean;
  notificationId?: string;
  reason?: 'not_found' | 'terminal' | 'already_processing' | 'recovered_stale';
}

export interface NotificationJobData {
  notificationId: string;
  attempt?: number;
}

export interface RenderedMessage {
  subject?: string;
  body: string;
}

export interface ProviderSendRequest {
  notificationId: string;
  businessId: string;
  customerId: string;
  channel: NotificationChannel;
  type: NotificationType;
  toPhone: string;
  message: RenderedMessage;
  metadata?: Record<string, unknown>;
}

export interface ProviderSendResult {
  provider: NotificationProvider;
  providerMessageId?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface NotificationDeliveryRecord {
  notificationId: string;
  status: NotificationStatus;
  attemptNumber: number;
  provider: NotificationProvider;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
}
