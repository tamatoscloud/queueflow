'use client';

import { useParams } from 'next/navigation';
import { CalmLanding } from '@/components/customer/calm/calm-landing';
import { QueueLandingError } from '@/components/customer/calm/queue-landing-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { BookingShell } from '@/components/layout/booking-shell';
import { useQueueLanding } from '@/hooks/use-queue-landing';

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
    return (
      <BookingShell>
        <QueueLandingError
          queueId={queueId}
          error={error}
          onRetry={() => void refetch()}
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell venueName={data.business.name}>
      <CalmLanding data={data} queueId={queueId} />
    </BookingShell>
  );
}
