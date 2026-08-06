import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import JoinSuccessContent from './success-content';

export default function JoinSuccessPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <LoadingState />
        </PageShell>
      }
    >
      <JoinSuccessContent />
    </Suspense>
  );
}
