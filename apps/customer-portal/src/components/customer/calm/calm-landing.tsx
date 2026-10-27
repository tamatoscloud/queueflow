'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import type { QueueLanding, QueueStatus } from '@/lib/api/types';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import {
  formatWaitingCount,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { formatEstimatedWaitLabel } from '@/lib/waiting/wait-estimate';
import { loadQueueSession } from '@/lib/storage/session';
import {
  QuykCard,
  QuykEyebrow,
  QuykIconBubble,
  QuykLinkButton,
  QuykPanel,
  QuykPill,
} from '@/components/quyk/ui';
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
    return { label: 'Paused', className: 'bg-warning-light text-[#7a4b0c]' };
  }
  if (status === 'CLOSED' || status === 'ARCHIVED' || !isOpen || !accepting) {
    return { label: 'Closed', className: 'bg-danger-light text-[#9a3412]' };
  }
  return { label: 'Open', className: 'bg-q-lime text-q-green' };
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
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-q-green">
          {paused ? 'This queue is paused' : 'This queue is not taking guests'}
        </h1>
        <p className="max-w-sm text-[14px] text-q-muted">
          {data.business.name} · {data.branch.name}. {data.queue.name} is {badge.label.toLowerCase()}{' '}
          right now. Ask staff if you should wait, or check back shortly.
        </p>
      </div>
    );
  }

  const minutes = data.live.estimatedWaitMinutes;
  const waitLabel = minutes > 0 ? formatEstimatedWaitLabel(minutes) : null;
  const [waitNumber, waitUnit] = waitLabel ? waitLabel.split(' ') : ['Any', 'moment'];

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div className="text-center">
        <QuykEyebrow className="text-q-subtle">Welcome to</QuykEyebrow>
        <h1 className="mt-1.5 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-q-green">
          {data.business.name}
        </h1>
        <p className="mt-2 text-[17px] font-medium text-q-green-muted">{data.queue.name}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[13px] text-q-subtle">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {data.branch.name}
          {data.branch.city ? ` · ${data.branch.city}` : ''}
        </p>
      </div>

      <QuykPanel className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <QuykEyebrow className="text-white/90">Estimated wait</QuykEyebrow>
          <QuykPill tone="lime">{badge.label}</QuykPill>
        </div>
        <p className="mt-4 flex items-baseline gap-2" aria-label={`Estimated wait ${waitLabel ?? 'any moment'}`}>
          <span className="text-[64px] font-bold leading-none tracking-[-0.04em] text-q-lime tabular-nums">
            {waitNumber}
          </span>
          <span className="text-[20px] font-semibold text-white">{waitUnit}</span>
        </p>
        <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3.5 text-[14px] text-white/90">
          <Users className="h-4 w-4" aria-hidden />
          <span>{formatWaitingCount(data.live.waitingCount, copy)}</span>
        </div>
      </QuykPanel>

      <QuykLinkButton href={`/q/${queueId}/join`}>Join queue</QuykLinkButton>

      <p className="px-2 text-center text-[13px] leading-snug text-q-muted">
        No app to download. Keep your phone handy — we&apos;ll tell you here when it&apos;s your
        turn.
      </p>

      <QuykCard className="flex items-center gap-3 px-4 py-4">
        <QuykIconBubble icon={Clock} size="lg" />
        <div>
          <p className="text-[15px] font-semibold text-q-ink">Live updates on this page</p>
          <p className="text-[13px] text-q-muted">Your place is saved if you refresh.</p>
        </div>
      </QuykCard>
    </div>
  );
}
