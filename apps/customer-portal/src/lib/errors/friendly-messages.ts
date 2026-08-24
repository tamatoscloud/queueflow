import { ApiClientError } from '@/lib/api/client';
import { isQueueUuid } from '@/lib/queue-id';

export type QueuePageErrorView = {
  title: string;
  message: string;
  retry: boolean;
};

export function queueLandingErrorView(
  queueId: string | undefined,
  error: unknown,
): QueuePageErrorView {
  if (!isQueueUuid(queueId)) {
    return {
      title: 'Invalid queue link',
      message:
        'This link is not a valid queue. Please scan the QR code at the venue again, or ask staff for a new link.',
      retry: false,
    };
  }
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return {
        title: 'Queue not found',
        message:
          'We could not find this queue. It may have been removed, or the link may be out of date.',
        retry: false,
      };
    }
    if (
      error.code === 'TIMEOUT' ||
      error.status === 0 ||
      error.code === 'NETWORK_ERROR' ||
      error.status >= 500
    ) {
      return {
        title: error.code === 'TIMEOUT' ? 'Still loading' : 'Service is busy',
        message:
          error.code === 'TIMEOUT'
            ? 'The queue is taking longer than usual. Tap retry — your place is not lost.'
            : 'The queue service is temporarily slow. Please try again in a moment.',
        retry: true,
      };
    }
  }
  return {
    title: 'Something went wrong',
    message: "We couldn't load this queue. Please try again.",
    retry: true,
  };
}

export function trackingPageErrorView(
  entryId: string | undefined,
  error: unknown,
): QueuePageErrorView {
  if (!isQueueUuid(entryId)) {
    return {
      title: 'Invalid tracking link',
      message:
        'This tracking link is not valid. Please open the link from your confirmation screen or from the venue.',
      retry: false,
    };
  }
  if (error instanceof ApiClientError) {
    if (error.status === 404 || error.status === 400) {
      return {
        title: 'Visit not found',
        message: 'We could not find your queue entry. It may have expired.',
        retry: false,
      };
    }
    if (
      error.code === 'TIMEOUT' ||
      error.status === 0 ||
      error.code === 'NETWORK_ERROR' ||
      error.status >= 500
    ) {
      return {
        title: error.code === 'TIMEOUT' ? 'Still updating' : 'Service is busy',
        message:
          error.code === 'TIMEOUT'
            ? "We're still fetching your place in line. Tap retry — you have not lost your spot."
            : "We're having trouble updating your queue. Don't worry — you can try again in a moment.",
        retry: true,
      };
    }
  }
  return {
    title: 'Something went wrong',
    message: "We're having trouble updating your queue. Don't worry — we'll keep trying.",
    retry: true,
  };
}

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
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
      return err.code === 'TIMEOUT'
        ? 'Joining is taking longer than usual — please try again. You have not been charged a spot yet.'
        : "You're offline. Check your connection and try again.";
    }
    if (err.status >= 500) {
      return "We couldn't join the queue just now. Please try again in a moment.";
    }
    return 'Please check your details and try again.';
  }
  return "We couldn't join the queue. Please check your details and try again.";
}

export function friendlyTrackingError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
      return err.code === 'TIMEOUT'
        ? "Updating is slow right now. Tap retry — you haven't lost your place."
        : "We're having trouble updating your queue. Don't worry — we'll keep trying.";
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
