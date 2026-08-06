'use client';

import Link from 'next/link';
import { Clock, Star, Users } from 'lucide-react';
import { GlassCard } from '@/components/customer/primitives';
import { Button } from '@/components/ui/button';
import type { EntryTracking } from '@/lib/api/types';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

type VisitCompletedProps = {
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

export function VisitCompleted({ tracking, className }: VisitCompletedProps) {
  const copy = getServiceModeCopy(tracking.queue.serviceMode);
  const waitMinutes = waitMinutesFromTracking(tracking);
  const context = contextLine(tracking);
  const queueId = tracking.queue.id;

  return (
    <div className={cn('flex flex-1 flex-col gap-5 py-4 animate-fade-in-up', className)}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success/30 to-secondary/30">
          <span className="text-4xl" aria-hidden>
            🎉
          </span>
        </div>
        <h1 className="text-3xl font-black">{copy.completedTitle}</h1>
        <p className="mt-2 text-muted">{copy.completedSubtitle}</p>
      </div>

      <GlassCard>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">Visit summary</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted">{copy.tokenLabel}</p>
            <p className="font-mono text-2xl font-black">{tracking.entry.displayCode}</p>
          </div>
          {context ? (
            <p className="text-sm font-semibold text-foreground">{context}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {tracking.queue.serviceMode === 'DINE_IN' ? (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted">Party</p>
                  <p className="font-bold">{tracking.entry.partySize} guests</p>
                </div>
              </div>
            ) : null}
            {waitMinutes != null ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-secondary" aria-hidden />
                <div>
                  <p className="text-xs text-muted">Total wait</p>
                  <p className="font-bold">{waitMinutes} min</p>
                </div>
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {tracking.business.name} · {tracking.branch.name}
          </p>
        </div>
      </GlassCard>

      <Button variant="gradient" className="h-12 rounded-2xl" asChild>
        <Link href={`/feedback/${tracking.entry.id}`}>
          <Star className="h-4 w-4" aria-hidden />
          Share your experience
        </Link>
      </Button>

      {queueId ? (
        <Button variant="outline" className="h-12 rounded-2xl" asChild>
          <Link href={`/q/${queueId}`}>{copy.visitAgainLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
