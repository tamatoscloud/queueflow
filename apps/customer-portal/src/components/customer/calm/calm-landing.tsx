'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Users } from 'lucide-react';
import type { QueueLanding, QueueStatus } from '@/lib/api/types';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import {
  formatWaitingCount,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { formatEstimatedWaitLabel } from '@/lib/waiting/wait-estimate';
import { loadQueueSession } from '@/lib/storage/session';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';
import { CalmReturningCustomer } from '@/components/customer/calm/calm-returning-customer';

type CalmLandingProps = {
  data: QueueLanding;
  queueId: string;
};

function statusLabel(status: QueueStatus, isOpen: boolean, accepting: boolean): {
  label: string;
  className: string;
} {
  if (status === 'PAUSED') {
    return { label: 'Paused', className: 'bg-warning-light text-amber-800' };
  }
  if (status === 'CLOSED' || status === 'ARCHIVED' || !isOpen || !accepting) {
    return { label: 'Closed', className: 'bg-danger-light text-red-800' };
  }
  return { label: 'Open', className: 'bg-success-light text-emerald-800' };
}

export function CalmLanding({ data, queueId }: CalmLandingProps) {
  const [activeSession, setActiveSession] = useState<ReturnType<typeof loadQueueSession>>(null);
  const mode = primaryServiceMode(data.queue.serviceMode ?? 'DINE_IN', data.business.enabledModes);
  const copy = getServiceModeCopy(mode);
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries && data.queue.status === 'ACTIVE';
  const badge = statusLabel(data.queue.status, data.live.isOpen, data.queue.isAcceptingEntries);

  useEffect(() => {
    const session = loadQueueSession();
    if (session?.queueId === queueId) setActiveSession(session);
  }, [queueId]);

  if (activeSession) {
    return (
      <CalmReturningCustomer
        session={activeSession}
        businessName={data.business.name}
        displayCode={activeSession.displayCode}
        queueId={queueId}
        onJoinAsSomeoneElse={() => setActiveSession(null)}
      />
    );
  }

  if (!canJoin) {
    const paused = data.queue.status === 'PAUSED';
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <CalmHeading>
          {paused ? 'This queue is paused' : 'This queue is not taking guests'}
        </CalmHeading>
        <p className="max-w-sm text-sm text-muted">
          {data.business.name} · {data.branch.name}. {data.queue.name} is {badge.label.toLowerCase()}
          right now. Ask staff if you should wait, or check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Welcome to
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {data.business.name}
        </h1>
        <p className="mt-2 text-base font-semibold text-foreground">{data.queue.name}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted sm:justify-start">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {data.branch.name}
          {data.branch.city ? ` · ${data.branch.city}` : ''}
        </p>
      </div>

      <CalmCard highlighted>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Estimated wait
            </p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums text-foreground">
              {data.live.estimatedWaitMinutes > 0
                ? formatEstimatedWaitLabel(data.live.estimatedWaitMinutes)
                : 'Any moment'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Users className="h-4 w-4" aria-hidden />
          <span>{formatWaitingCount(data.live.waitingCount, copy)}</span>
        </div>
      </CalmCard>

      <Link
        href={`/q/${queueId}/join`}
        className="flex h-16 w-full items-center justify-center rounded-2xl bg-primary-dark text-lg font-bold uppercase tracking-wide text-white shadow-md transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Join queue
      </Link>

      <p className="text-center text-sm text-muted">
        No app download. Keep your phone handy — we&apos;ll tell you when it&apos;s your turn.
      </p>

      <CalmCard className="text-center">
        <Clock className="mx-auto h-5 w-5 text-primary" aria-hidden />
        <p className="mt-2 text-xs font-medium text-foreground">Live updates on this page</p>
        <p className="text-[10px] text-muted">Your place is saved if you refresh.</p>
      </CalmCard>
    </div>
  );
}
