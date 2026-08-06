'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Users } from 'lucide-react';
import type { QueueLanding } from '@/lib/api/types';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import {
  formatWaitingCount,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { loadQueueSession } from '@/lib/storage/session';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';
import { CalmReturningCustomer } from '@/components/customer/calm/calm-returning-customer';
import { isRestaurantDemo } from '@/lib/demo/restaurant-content';

type CalmLandingProps = {
  data: QueueLanding;
  queueId: string;
};

function busyLevel(waitingCount: number): { label: string; width: string } {
  if (waitingCount <= 3) return { label: 'Not busy', width: '25%' };
  if (waitingCount <= 10) return { label: 'Moderate', width: '55%' };
  if (waitingCount <= 20) return { label: 'Busy', width: '78%' };
  return { label: 'Very busy', width: '95%' };
}

export function CalmLanding({ data, queueId }: CalmLandingProps) {
  const [activeSession, setActiveSession] = useState<ReturnType<typeof loadQueueSession>>(null);
  const mode = primaryServiceMode(data.queue.serviceMode ?? 'DINE_IN', data.business.enabledModes);
  const copy = getServiceModeCopy(mode);
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries;
  const busy = busyLevel(data.live.waitingCount);
  const isDemo = isRestaurantDemo(data.business.name);

  useEffect(() => {
    const session = loadQueueSession();
    if (session?.queueId === queueId) setActiveSession(session);
  }, [queueId]);

  if (!canJoin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <CalmHeading>We&apos;re not taking guests right now</CalmHeading>
        <p className="text-sm text-[#6b6870]">
          {data.business.name} is currently closed. Please check back soon.
        </p>
      </div>
    );
  }

  if (activeSession) {
    return (
      <CalmReturningCustomer
        session={activeSession}
        businessName={data.business.name}
        displayCode={activeSession.displayCode}
        queueId={queueId}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <div className="relative -mx-5 h-48 overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#eae5f8] via-[#f9ddc7]/40 to-white">
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6870]">
            {copy.mode === 'TAKEAWAY' ? 'Pickup' : copy.mode === 'DRIVE_IN' ? 'Drive-in' : 'Dine-in'}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#17151a]">{data.business.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-[#6b6870]">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {data.branch.name}
          </p>
        </div>
      </div>

      <CalmCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#6b6870]">Estimated wait</p>
            <p className="font-display text-3xl font-bold text-[#17151a]">
              ~{data.live.estimatedWaitMinutes} min
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Open
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#6b6870]">
          <Users className="h-4 w-4" aria-hidden />
          {formatWaitingCount(data.live.waitingCount, copy)}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-[#6b6870]">
            <span>How busy we are</span>
            <span>{busy.label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eae5f8]">
            <div
              className="h-full rounded-full bg-[#8b7cf8] transition-all duration-500"
              style={{ width: busy.width }}
            />
          </div>
        </div>
      </CalmCard>

      <Link
        href={`/q/${queueId}/join`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-[#8b7cf8] text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
      >
        Join the queue
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <CalmCard className="text-center">
          <Clock className="mx-auto h-5 w-5 text-[#8b7cf8]" aria-hidden />
          <p className="mt-2 text-xs font-medium text-[#17151a]">Live updates</p>
          <p className="text-[10px] text-[#6b6870]">We&apos;ll keep you posted</p>
        </CalmCard>
        {isDemo ? (
          <CalmCard className="text-center">
            <span className="text-lg" aria-hidden>
              🍽️
            </span>
            <p className="mt-2 text-xs font-medium text-[#17151a]">Relax while you wait</p>
            <p className="text-[10px] text-[#6b6870]">Browse menu after joining</p>
          </CalmCard>
        ) : (
          <CalmCard className="text-center">
            <span className="text-lg" aria-hidden>
              ✨
            </span>
            <p className="mt-2 text-xs font-medium text-[#17151a]">Relax while you wait</p>
            <p className="text-[10px] text-[#6b6870]">We&apos;ll notify you when it&apos;s your turn</p>
          </CalmCard>
        )}
      </div>
    </div>
  );
}
