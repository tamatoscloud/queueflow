import { apiFetch } from './client';
import { getTrackingTokenForEntry } from '@/lib/storage/session';
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

  /**
   * Sends the tab's tracking token (if any) so the API returns a refreshed
   * one; without it the response is read-only (no `trackingToken`).
   */
  getEntryTracking: (entryId: string) => {
    const token = getTrackingTokenForEntry(entryId);
    return apiFetch<EntryTracking>(`/customer-portal/entries/${entryId}/tracking`, {
      headers: token ? { 'x-tracking-token': token } : undefined,
    });
  },

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
      body: JSON.stringify({
        ...payload,
        trackingToken: payload.trackingToken ?? getTrackingTokenForEntry(entryId),
      }),
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
      body: JSON.stringify({
        ...payload,
        trackingToken: payload.trackingToken ?? getTrackingTokenForEntry(payload.entryId),
      }),
    }),

  submitFeedback: (payload: SubmitFeedbackPayload) =>
    apiFetch<unknown>('/customer-portal/feedback', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        trackingToken: payload.trackingToken ?? getTrackingTokenForEntry(payload.queueEntryId),
      }),
    }),
};
