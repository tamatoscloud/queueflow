'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { CalmLanding } from '@/components/customer/calm/calm-landing';
import { QueueLandingError } from '@/components/customer/calm/queue-landing-error';
import { CalmSkeleton } from '@/components/customer/calm/calm-skeleton';
import { CalmCard } from '@/components/customer/calm/primitives';
import { BookingShell } from '@/components/layout/booking-shell';
import { useQueueLanding } from '@/hooks/use-queue-landing';

function MissingQueueState({ mode }: { mode: 'takeaway' | 'drive' }) {
  return (
    <div className="flex flex-1 flex-col gap-5 py-8">
      <CalmCard className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#8b7cf8]" aria-hidden />
        <div className="space-y-2 text-sm text-[#6b6870]">
          <p className="font-semibold text-[#17151a]">
            {mode === 'takeaway' ? 'Scan your receipt QR' : 'Scan the drive-in entrance QR'}
          </p>
          <p>
            Please scan the QR code provided at the counter to join the{' '}
            {mode === 'takeaway' ? 'pickup' : 'drive-in'} queue.
          </p>
          <p>If you received a link from the restaurant, open that link directly.</p>
        </div>
      </CalmCard>
    </div>
  );
}

function BranchModeLanding({ queueId }: { queueId: string }) {
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

function BranchModePageInner({ mode }: { mode: 'takeaway' | 'drive' }) {
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queue');

  if (!queueId) {
    return (
      <BookingShell>
        <MissingQueueState mode={mode} />
      </BookingShell>
    );
  }

  return <BranchModeLanding queueId={queueId} />;
}

export function BranchModePage({ mode }: { mode: 'takeaway' | 'drive' }) {
  return (
    <Suspense
      fallback={
        <BookingShell>
          <CalmSkeleton />
        </BookingShell>
      }
    >
      <BranchModePageInner mode={mode} />
    </Suspense>
  );
}
