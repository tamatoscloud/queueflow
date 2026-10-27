'use client';

import { useEffect, useState } from 'react';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import {
  formatHoldCountdown,
  tableHoldSecondsRemaining,
} from '@/lib/waiting/wait-helpers';
import { Bell, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type LightReadyExperienceProps = {
  displayCode: string;
  calledAt: string | null;
  branchName: string;
  businessName: string;
  partySize: number;
  position: number;
  copy: ServiceModeCopy;
  className?: string;
};

function passContext(copy: ServiceModeCopy, partySize: number): string | null {
  if (copy.mode === 'DINE_IN') return `Party of ${partySize}`;
  return null;
}

function vibrateCalled() {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 80, 200, 80, 400]);
  }
}

export function LightReadyExperience({
  displayCode,
  calledAt,
  branchName,
  businessName,
  partySize,
  copy,
  className,
}: LightReadyExperienceProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => tableHoldSecondsRemaining(calledAt));

  useEffect(() => {
    const tick = () => setSecondsLeft(tableHoldSecondsRemaining(calledAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calledAt]);

  useEffect(() => {
    vibrateCalled();
  }, [displayCode]);

  const context = passContext(copy, partySize);
  const holdTotal = 120;
  const holdFraction = Math.min(1, Math.max(0, secondsLeft / holdTotal));

  return (
    <div
      className={cn('flex flex-1 flex-col items-center justify-center gap-6 pb-6 text-center', className)}
      role="status"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-q-lime text-q-green">
          <Bell className="h-8 w-8" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-q-lime">
          {copy.readyEyebrow}
        </p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.02em] text-white">
          {copy.readyTitle}
        </h1>
        <p className="mt-2 max-w-[19rem] text-[15px] leading-snug text-white/85">
          {copy.readyDescription(branchName)}
        </p>
        <span className="sr-only">{businessName}</span>
      </div>

      <div className="w-full rounded-[26px] bg-white px-5 pb-5 pt-5 text-q-ink">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-q-subtle">
          Your number
        </p>
        <p
          className="mt-1 text-[64px] font-bold leading-none tracking-[-0.03em] text-q-green tabular-nums"
          aria-label={`Queue token ${displayCode}`}
        >
          {displayCode}
        </p>
        {context ? <p className="mt-3 text-[16px] text-q-muted">{context}</p> : null}
        <div className="mt-4 border-t border-q-line pt-4">
          <p className="flex items-center justify-center gap-2 text-[14px] font-semibold text-q-green tabular-nums">
            <Clock className="h-4 w-4" aria-hidden />
            {secondsLeft > 0
              ? `Hold expires in ${formatHoldCountdown(secondsLeft)}`
              : 'Please see the host now'}
          </p>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-q-line"
            role="progressbar"
            aria-label="Hold time remaining"
            aria-valuemin={0}
            aria-valuemax={holdTotal}
            aria-valuenow={secondsLeft}
          >
            <div
              className="h-full rounded-full bg-q-green transition-[width] duration-1000 ease-linear"
              style={{ width: `${holdFraction * 100}%` }}
            />
          </div>
          <p className="mt-3 text-[13px] text-q-muted">Show this number to the host.</p>
        </div>
      </div>
    </div>
  );
}
