'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LoadingState } from '@/components/shared/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import { loadQueueSession } from '@/lib/storage/session';

/** Legacy route — redirects to unified live tracking experience. */
export default function JoinSuccessContent() {
  const { queueId } = useParams<{ queueId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const entryId = searchParams.get('entryId') ?? loadQueueSession()?.entryId;
    if (entryId) {
      router.replace(`/track/${entryId}?welcome=1`);
      return;
    }
    router.replace(`/q/${queueId}`);
  }, [queueId, router, searchParams]);

  return (
    <PageShell gradient>
      <LoadingState />
    </PageShell>
  );
}
