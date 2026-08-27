import { apiFetch } from './client';
import type {
  EntryTracking,
  JoinQueuePayload,
  JoinQueueResult,
  QueueLanding,
  SubmitFeedbackPayload,
  GuestMenuResponse,
} from './types';

export const customerApi = {
  getQueueLanding: (queueId: string) =>
    apiFetch<QueueLanding>(`/customer-portal/queues/${queueId}`),

  joinQueue: (queueId: string, payload: JoinQueuePayload) =>
    apiFetch<JoinQueueResult>(`/queues/${queueId}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEntryTracking: (entryId: string) =>
    apiFetch<EntryTracking>(`/customer-portal/entries/${entryId}/tracking`),

  updateEntryContact: (
    entryId: string,
    payload: { phone: string; trackingToken?: string },
  ) =>
    apiFetch<{
      entryId: string;
      phone: string;
      phoneMasked: string;
      notificationPreference: string;
    }>(`/customer-portal/entries/${entryId}/contact`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getBusinessMenu: (businessId: string) =>
    apiFetch<GuestMenuResponse>(`/customer-portal/businesses/${businessId}/menu`),

  getWebPushPublicKey: () =>
    apiFetch<{ publicKey: string; enabled: boolean }>(
      '/customer-portal/push/vapid-public-key',
    ),

  subscribeWebPush: (payload: {
    entryId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    trackingToken?: string;
  }) =>
    apiFetch<{ ok: true }>('/customer-portal/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitFeedback: (payload: SubmitFeedbackPayload) =>
    apiFetch<unknown>('/customer-portal/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
