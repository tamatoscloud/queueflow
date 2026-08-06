'use client';

import { useEffect, useState } from 'react';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import {
  formatHoldCountdown,
  tableHoldSecondsRemaining,
} from '@/lib/waiting/wait-helpers';
import { CalmCard, CalmLivePill } from '@/components/customer/calm/primitives';
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

export function LightReadyExperience({
  displayCode,
  calledAt,
  branchName,
  businessName,
  partySize,
  copy,
  className,
}: LightReadyExperienceProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    tableHoldSecondsRemaining(calledAt),
  );

  useEffect(() => {
    const tick = () => setSecondsLeft(tableHoldSecondsRemaining(calledAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calledAt]);

  const holdTotal = 5 * 60;
  const progress = Math.round(((holdTotal - secondsLeft) / holdTotal) * 100);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const context = passContext(copy, partySize);

  return (
    <div
      className={cn('flex flex-1 flex-col gap-6 pb-4', className)}
      role="status"
      aria-live="assertive"
    >
      <header className="text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="font-display text-lg font-bold text-[#17151a]">{businessName}</h2>
          <CalmLivePill label="Live" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#17151a]">
          {copy.readyTitle.replace('!', '')}
          <span className="text-[#8b7cf8]">!</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6b6870]">
          {copy.readyDescription(branchName)}
        </p>
      </header>

      <div className="flex flex-col items-center gap-4 py-2">
        <div
          className="booking-ready-ring flex h-48 w-48 items-center justify-center rounded-full p-2"
          style={{ '--ring-progress': `${progress}%` } as React.CSSProperties}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#faf8f5]">
            <span className="font-display text-4xl font-bold tabular-nums text-[#17151a]">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="mt-1 text-xs font-medium text-[#6b6870]">remaining</span>
          </div>
        </div>
      </div>

      <CalmCard highlighted className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b6870]">
          {businessName}
        </p>
        <p className="mt-3 font-display text-4xl font-bold text-[#8b7cf8]">{displayCode}</p>
        {context ? <p className="mt-2 text-sm text-[#6b6870]">{context}</p> : null}
        <p className="mt-4 text-sm text-[#6b6870]">{copy.readyHoldMessage}</p>
        <p className="mt-2 text-xs tabular-nums text-[#6b6870]">
          Hold expires in {formatHoldCountdown(secondsLeft)}
        </p>
      </CalmCard>
    </div>
  );
}
