import { CalmError } from '@/components/customer/calm/calm-error';
import {
  queueLandingErrorView,
  trackingPageErrorView,
} from '@/lib/errors/friendly-messages';

export function QueueLandingError({
  queueId,
  error,
  onRetry,
}: {
  queueId?: string;
  error: unknown;
  onRetry: () => void;
}) {
  const view = queueLandingErrorView(queueId, error);
  return (
    <CalmError
      title={view.title}
      message={view.message}
      onRetry={view.retry ? onRetry : undefined}
    />
  );
}

export function TrackingPageError({
  entryId,
  error,
  onRetry,
}: {
  entryId?: string;
  error: unknown;
  onRetry: () => void;
}) {
  const view = trackingPageErrorView(entryId, error);
  return (
    <CalmError
      title={view.title}
      message={view.message}
      onRetry={view.retry ? onRetry : undefined}
    />
  );
}
