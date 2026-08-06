'use client';

import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { CalmCard } from '@/components/customer/calm/primitives';

export function CalmWelcomeBanner({
  copy,
  onDismiss,
}: {
  copy: ServiceModeCopy;
  onDismiss: () => void;
}) {
  return (
    <div role="status">
      <CalmCard highlighted className="text-center">
      <p className="font-display text-lg font-bold text-[#17151a]">{copy.welcomeTitle}</p>
      <p className="mt-1 text-sm text-[#6b6870]">{copy.welcomeSubtitle}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs font-semibold text-[#8b7cf8]"
      >
        Got it
      </button>
      </CalmCard>
    </div>
  );
}
