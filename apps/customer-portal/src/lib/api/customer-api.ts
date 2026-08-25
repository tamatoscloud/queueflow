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

  getBusinessMenu: (businessId: string) =>
    apiFetch<GuestMenuResponse>(`/customer-portal/businesses/${businessId}/menu`),

  submitFeedback: (payload: SubmitFeedbackPayload) =>
    apiFetch<unknown>('/customer-portal/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
