'use client';

import { useEffect, useState } from 'react';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import {
  formatHoldCountdown,
  tableHoldSecondsRemaining,
} from '@/lib/waiting/wait-helpers';
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

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const context = passContext(copy, partySize);

  return (
    <div
      className={cn('flex flex-1 flex-col items-center justify-center gap-8 pb-4 text-center', className)}
      role="status"
      aria-live="assertive"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">You&apos;re up</p>
        <h2 className="mt-2 text-lg font-bold text-white">{businessName}</h2>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-white">{copy.readyTitle}</h1>
        <p className="mt-3 text-base leading-relaxed text-white/90">
          {copy.readyDescription(branchName)}
        </p>
      </div>

      <div className="w-full rounded-3xl bg-white px-4 py-8 text-foreground shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Your number</p>
        <p className="mt-2 font-display text-6xl font-bold tabular-nums text-primary">{displayCode}</p>
        {context ? <p className="mt-2 text-sm text-muted">{context}</p> : null}
        <p className="mt-4 text-sm text-foreground">{copy.readyHoldMessage}</p>
        <p className="mt-2 text-xs tabular-nums text-muted">
          Hold expires in {formatHoldCountdown(secondsLeft)} ({String(mins).padStart(2, '0')}:
          {String(secs).padStart(2, '0')} remaining)
        </p>
      </div>
    </div>
  );
}
