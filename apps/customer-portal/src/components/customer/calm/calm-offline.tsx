'use client';

import { CalmButton, CalmCard, CalmHeading } from '@/components/customer/calm/primitives';

export function CalmOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-12 text-center">
      <CalmHeading>We&apos;re having trouble connecting</CalmHeading>
      <CalmCard className="w-full">
        <p className="text-sm leading-relaxed text-q-muted">
          Your queue information may be out of date. Check your connection and try again.
        </p>
      </CalmCard>
      {onRetry ? <CalmButton onClick={onRetry}>Try again</CalmButton> : null}
    </div>
  );
}
