'use client';

import { useEffect, useState } from 'react';
import { TokenDisplay } from '@/components/queue/token-display';
import { ConfettiBurst } from '@/components/queue/confetti-burst';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import {
  formatHoldCountdown,
  tableHoldSecondsRemaining,
} from '@/lib/waiting/wait-helpers';
import { cn } from '@/lib/utils';

export function TableReadyExperience({
  displayCode,
  calledAt,
  branchName,
  copy,
  className,
}: {
  displayCode: string;
  calledAt: string | null;
  branchName: string;
  copy: ServiceModeCopy;
  className?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    tableHoldSecondsRemaining(calledAt),
  );

  useEffect(() => {
    const tick = () => setSecondsLeft(tableHoldSecondsRemaining(calledAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [calledAt]);

  return (
    <div
      className={cn(
        'relative flex flex-1 flex-col items-center gap-6 py-6 text-center animate-fade-in-up',
        className,
      )}
      role="status"
      aria-live="assertive"
    >
      <ConfettiBurst active />
      <p className="text-5xl" aria-hidden>
        🎉
      </p>
      <h1 className="text-3xl font-black text-foreground">{copy.readyTitle}</h1>
      <TokenDisplay code={displayCode} variant="code-only" className="text-5xl" />
      <p className="max-w-xs text-sm text-muted">{copy.readyDescription(branchName)}</p>

      <div className="glass w-full max-w-xs rounded-3xl p-6">
        <p className="text-5xl font-black tabular-nums tracking-tight text-primary">
          {formatHoldCountdown(secondsLeft)}
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">remaining</p>
        <p className="mt-4 text-sm text-muted">{copy.readyHoldMessage}</p>
      </div>
    </div>
  );
}
