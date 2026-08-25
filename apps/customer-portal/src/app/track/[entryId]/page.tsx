'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LightWaitingExperience } from '@/components/customer/light/light-waiting-experience';
import { LightReadyExperience } from '@/components/customer/light/light-ready-experience';
import { CalmWelcomeBanner } from '@/components/customer/calm/calm-welcome-banner';
import { TrackingPageError } from '@/components/customer/calm/queue-landing-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { QueueEnded } from '@/components/customer/queue-ended';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { BookingShell } from '@/components/layout/booking-shell';
import { useEntryTracking } from '@/hooks/use-entry-tracking';
import { useGuestTurnNotifier } from '@/hooks/use-guest-turn-notifier';
import { useRealtimeConnection } from '@/hooks/use-realtime-connection';
import { GuestTurnToast } from '@/components/customer/guest-turn-toast';
import { clearQueueSession } from '@/lib/storage/session';

export default function TrackQueuePage() {
  const { entryId } = useParams<{ entryId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connection = useRealtimeConnection();
  const { data, isLoading, isError, error, refetch } = useEntryTracking(entryId);
  const [showWelcome, setShowWelcome] = useState(searchParams.get('welcome') === '1');

  const readyCopy = data ? getServiceModeCopy(data.queue.serviceMode) : null;
  useGuestTurnNotifier({
    entryId,
    status: data?.entry.status,
    calledAt: data?.entry.calledAt,
    displayCode: data?.entry.displayCode,
    businessName: data?.business.name,
    readyTitle: readyCopy?.readyTitle,
  });

  useEffect(() => {
    if (!showWelcome) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('welcome');
    const query = params.toString();
    router.replace(`/track/${entryId}${query ? `?${query}` : ''}`, { scroll: false });
  }, [entryId, router, searchParams, showWelcome]);

  useEffect(() => {
    if (!data) return;
    if (data.entry.status === 'COMPLETED') {
      clearQueueSession();
      router.replace(`/completed/${entryId}`);
    }
  }, [data, entryId, router]);

  if (isLoading) {
    return (
      <BookingShell showJazzPill>
        <CalmSkeleton />
      </BookingShell>
    );
  }

  if (isError || !data) {
    return (
      <BookingShell showJazzPill>
        <TrackingPageError
          entryId={entryId}
          error={error}
          onRetry={() => void refetch()}
        />
      </BookingShell>
    );
  }

  const venueName = data.business.name;
  const copy = getServiceModeCopy(data.queue.serviceMode);

  if (data.entry.status === 'CANCELLED') {
    clearQueueSession();
    return (
      <BookingShell venueName={venueName} showJazzPill>
        <GuestTurnToast />
        <QueueEnded
          variant="cancelled"
          queueId={data.queue.id}
          serviceMode={data.queue.serviceMode}
        />
      </BookingShell>
    );
  }

  if (data.entry.status === 'NO_SHOW' || data.entry.status === 'SKIPPED') {
    clearQueueSession();
    return (
      <BookingShell venueName={venueName} showJazzPill>
        <GuestTurnToast />
        <QueueEnded
          variant={data.entry.status === 'NO_SHOW' ? 'no_show' : 'skipped'}
          queueId={data.queue.id}
          serviceMode={data.queue.serviceMode}
        />
      </BookingShell>
    );
  }

  if (data.entry.status === 'HOLDING') {
    return (
      <BookingShell variant="waiting" showJazzPill>
        <GuestTurnToast />
        <LightWaitingExperience tracking={data} connection={connection} />
      </BookingShell>
    );
  }

  if (data.entry.status === 'CALLED') {
    return (
      <BookingShell venueName={venueName} showJazzPill tone="called">
        <GuestTurnToast />
        <LightReadyExperience
          displayCode={data.entry.displayCode}
          calledAt={data.entry.calledAt}
          branchName={data.branch.name}
          businessName={data.business.name}
          partySize={data.entry.partySize}
          position={data.position}
          copy={copy}
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell variant="waiting" showJazzPill>
      <GuestTurnToast />
      {showWelcome ? (
        <CalmWelcomeBanner copy={copy} onDismiss={() => setShowWelcome(false)} />
      ) : null}
      <LightWaitingExperience tracking={data} connection={connection} />
    </BookingShell>
  );
}
