'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { CalmCompleted } from '@/components/customer/calm/calm-completed';
import { TrackingPageError } from '@/components/customer/calm/queue-landing-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { BookingShell } from '@/components/layout/booking-shell';
import { useEntryTracking } from '@/hooks/use-entry-tracking';
import { clearQueueSession } from '@/lib/storage/session';

export default function QueueCompletedPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const { data, isLoading, isError, error, refetch } = useEntryTracking(entryId);

  useEffect(() => {
    if (data?.entry.status === 'COMPLETED') {
      clearQueueSession();
    }
  }, [data?.entry.status]);

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
        <TrackingPageError
          entryId={entryId}
          error={error}
          onRetry={() => void refetch()}
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell venueName={data.business.name}>
      <CalmCompleted tracking={data} />
    </BookingShell>
  );
}
