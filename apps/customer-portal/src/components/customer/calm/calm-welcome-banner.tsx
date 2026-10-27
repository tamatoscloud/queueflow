'use client';

import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';

/** Figma first-visit banner on the tracking page ("You're on the list!"). */
export function CalmWelcomeBanner({
  copy,
  onDismiss,
}: {
  copy: ServiceModeCopy;
  onDismiss: () => void;
}) {
  return (
    <div role="status" className="mb-4 rounded-[20px] bg-q-lime-tint px-4 py-4">
      <p className="text-[15px] font-semibold text-q-green">{copy.welcomeTitle}</p>
      <p className="mt-1 text-[13px] text-q-muted">{copy.welcomeSubtitle}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-[14px] font-semibold text-q-green"
      >
        Got it
      </button>
    </div>
  );
}
