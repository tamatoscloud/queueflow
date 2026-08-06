import { ApiClientError } from '@/lib/api/client';

export function friendlyJoinError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'DUPLICATE_ACTIVE_JOIN') {
      return 'You already have an active spot in this queue.';
    }
    if (err.code === 'QUEUE_NOT_ACCEPTING' || err.code === 'OUTSIDE_OPERATING_HOURS') {
      return 'This queue is not accepting guests right now.';
    }
    if (err.code === 'QUEUE_CAPACITY_EXCEEDED') {
      return 'The queue is full at the moment. Please try again shortly.';
    }
    if (err.code === 'NETWORK_ERROR') {
      return "You're offline. We'll reconnect automatically.";
    }
    if (err.status >= 500) {
      return "We couldn't join the queue. Please try again in a moment.";
    }
    return 'Please check your details and try again.';
  }
  return "We couldn't join the queue. Please check your details and try again.";
}

export function friendlyTrackingError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'NETWORK_ERROR') {
      return "We're having trouble updating your queue. Don't worry — we'll keep trying.";
    }
    if (err.status >= 500) {
      return "We're having trouble updating your queue. Don't worry — we'll keep trying.";
    }
    if (err.status === 404) {
      return 'We could not find your queue entry. It may have expired.';
    }
    return "We're having trouble updating your queue. Don't worry — we'll keep trying.";
  }
  return "We're having trouble updating your queue. Don't worry — we'll keep trying.";
}
