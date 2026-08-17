'use client';

import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
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
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
        <CalmHeading className="mt-4">{copy.completedTitle}</CalmHeading>
        <p className="mt-2 text-sm text-muted">{copy.completedSubtitle}</p>
      </div>

      <CalmCard highlighted className="text-center">
        <p className="text-sm font-semibold text-foreground">{tracking.business.name}</p>
        <p className="mt-1 text-xs text-muted">{tracking.queue.name}</p>
        <p className="mt-3 font-display text-4xl font-bold tabular-nums text-primary">
          {tracking.entry.displayCode}
        </p>
        {context ? <p className="mt-2 text-sm text-muted">{context}</p> : null}
        {waitMinutes != null ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" aria-hidden />
            Waited approximately {waitMinutes} min
          </p>
        ) : null}
      </CalmCard>

      <Link
        href={`/feedback/${tracking.entry.id}`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Share feedback
      </Link>

      {queueId ? (
        <Link href={`/q/${queueId}`} className="block text-center text-sm font-medium text-primary">
          {copy.visitAgainLabel}
        </Link>
      ) : null}
    </div>
  );
}
