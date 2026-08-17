'use client';

import { useParams } from 'next/navigation';
import { BookingRegistration } from '@/components/customer/light/booking-registration';
import { QueueLandingError } from '@/components/customer/calm/queue-landing-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { BookingShell } from '@/components/layout/booking-shell';
import { useQueueLanding } from '@/hooks/use-queue-landing';

export default function JoinQueuePage() {
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
      <BookingRegistration data={data} queueId={queueId} />
    </BookingShell>
  );
}
