'use client';

import { useParams } from 'next/navigation';
import { CalmLanding } from '@/components/customer/calm/calm-landing';
import { CalmError } from '@/components/customer/calm/calm-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { BookingShell } from '@/components/layout/booking-shell';
import { useQueueLanding } from '@/hooks/use-queue-landing';
import { ApiClientError } from '@/lib/api/client';

export default function QueueLandingPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const { data, isLoading, isError, error, refetch } = useQueueLanding(queueId);

  if (isLoading) {
    return (
      <BookingShell>
        <CalmSkeleton />
      </BookingShell>
    );
  }

  if (isError || !data) {
    const message =
      error instanceof ApiClientError
        ? "We couldn't load this queue. Please try again."
        : undefined;
    return (
      <BookingShell>
        <CalmError message={message} onRetry={() => void refetch()} />
      </BookingShell>
    );
  }

  return (
    <BookingShell venueName={data.business.name}>
      <CalmLanding data={data} queueId={queueId} />
    </BookingShell>
  );
}
