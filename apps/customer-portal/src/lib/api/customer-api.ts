import { apiFetch } from './client';
import type {
  EntryTracking,
  JoinQueuePayload,
  JoinQueueResult,
  QueueLanding,
  SubmitFeedbackPayload,
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

  submitFeedback: (payload: SubmitFeedbackPayload) =>
    apiFetch<unknown>('/customer-portal/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
