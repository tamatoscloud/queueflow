'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { CalmCompleted } from '@/components/customer/calm/calm-completed';
import { CalmError } from '@/components/customer/calm/calm-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { BookingShell } from '@/components/layout/booking-shell';
import { useEntryTracking } from '@/hooks/use-entry-tracking';
import { clearQueueSession } from '@/lib/storage/session';
import { ApiClientError } from '@/lib/api/client';
import { friendlyTrackingError } from '@/lib/errors/friendly-messages';

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
    const message =
      error instanceof ApiClientError
        ? friendlyTrackingError(error)
        : "We couldn't load your visit details.";
    return (
      <BookingShell>
        <CalmError message={message} onRetry={() => void refetch()} />
      </BookingShell>
    );
  }

  return (
    <BookingShell venueName={data.business.name}>
      <CalmCompleted tracking={data} />
    </BookingShell>
  );
}
