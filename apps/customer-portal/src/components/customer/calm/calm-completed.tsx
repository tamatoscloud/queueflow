'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { EntryTracking } from '@/lib/api/types';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';
import { cn } from '@/lib/utils';

type CalmCompletedProps = {
  tracking: EntryTracking;
  className?: string;
};

function waitMinutesFromTracking(tracking: EntryTracking): number | null {
  const joined = tracking.entry.joinedAt ? new Date(tracking.entry.joinedAt).getTime() : null;
  const end = tracking.entry.calledAt
    ? new Date(tracking.entry.calledAt).getTime()
    : Date.now();
  if (!joined || Number.isNaN(joined) || Number.isNaN(end)) return null;
  const mins = Math.round((end - joined) / 60_000);
  return mins > 0 ? mins : null;
}

function contextLine(tracking: EntryTracking): string | null {
  const meta = tracking.entry.metadata;
  if (tracking.queue.serviceMode === 'TAKEAWAY' && meta?.orderNumber) {
    return `Order #${meta.orderNumber}`;
  }
  if (tracking.queue.serviceMode === 'DRIVE_IN') {
    const vehicle = [meta?.vehicleColor, meta?.vehicleMake].filter(Boolean).join(' ');
    const plate = meta?.vehiclePlate;
    if (vehicle && plate) return `${vehicle} · ${plate}`;
    if (vehicle) return vehicle;
    if (plate) return plate;
  }
  if (tracking.queue.serviceMode === 'DINE_IN' && tracking.entry.partySize > 0) {
    return `Party of ${tracking.entry.partySize}`;
  }
  return null;
}

export function CalmCompleted({ tracking, className }: CalmCompletedProps) {
  const copy = getServiceModeCopy(tracking.queue.serviceMode);
  const waitMinutes = waitMinutesFromTracking(tracking);
  const context = contextLine(tracking);
  const queueId = tracking.queue.id;

  return (
    <div className={cn('flex flex-1 flex-col gap-6 py-4', className)}>
      <div className="text-center">
        <span className="text-5xl" role="img" aria-label="Celebration">
          ✨
        </span>
        <CalmHeading className="mt-4">{copy.completedTitle}</CalmHeading>
        <p className="mt-2 text-sm text-[#6b6870]">{copy.completedSubtitle}</p>
      </div>

      <CalmCard highlighted className="text-center">
        <p className="text-sm font-semibold text-[#17151a]">{tracking.business.name}</p>
        <p className="mt-3 font-display text-3xl font-bold text-[#8b7cf8]">
          {tracking.entry.displayCode}
        </p>
        {context ? <p className="mt-2 text-sm text-[#6b6870]">{context}</p> : null}
        {waitMinutes != null ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#6b6870]">
            <Clock className="h-4 w-4" aria-hidden />
            Waited approximately {waitMinutes} min
          </p>
        ) : null}
      </CalmCard>

      <div className="text-center">
        <p className="font-display text-lg font-semibold text-[#17151a]">How was your experience?</p>
      </div>

      <Link
        href={`/feedback/${tracking.entry.id}`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-[#8b7cf8] text-base font-semibold text-white shadow-sm"
      >
        Share feedback
      </Link>

      {queueId ? (
        <Link href={`/q/${queueId}`} className="block text-center text-sm font-medium text-[#8b7cf8]">
          {copy.visitAgainLabel}
        </Link>
      ) : null}
    </div>
  );
}
