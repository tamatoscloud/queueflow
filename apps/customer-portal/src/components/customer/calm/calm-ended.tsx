'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import type { ServiceMode } from '@/lib/api/types';
import { getServiceModeCopy, type EndedVariant } from '@/lib/restaurant/service-mode-config';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';

type CalmEndedProps = {
  variant: EndedVariant;
  queueId?: string;
  serviceMode?: ServiceMode;
  reason?: string;
};

export function CalmEnded({ variant, queueId, serviceMode, reason }: CalmEndedProps) {
  const copy = getServiceModeCopy(serviceMode);
  const ended = copy.ended[variant];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-8 text-center">
      <CalmHeading>{ended.title}</CalmHeading>
      <CalmCard className="w-full">
        <p className="text-sm leading-relaxed text-[#6b6870]">{reason ?? ended.description}</p>
      </CalmCard>

      {queueId ? (
        <Link
          href={`/q/${queueId}`}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {ended.rejoinLabel}
        </Link>
      ) : null}
    </div>
  );
}
