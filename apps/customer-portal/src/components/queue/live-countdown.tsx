'use client';

import { useEffect, useState } from 'react';
import { formatWait } from '@/lib/utils';

export function LiveCountdown({
  estimatedWaitMinutes,
  snapshotGeneratedAt,
}: {
  estimatedWaitMinutes: number;
  snapshotGeneratedAt: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(estimatedWaitMinutes * 60);

  useEffect(() => {
    const base = new Date(snapshotGeneratedAt).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - base) / 1000);
      setSecondsLeft(Math.max(0, estimatedWaitMinutes * 60 - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estimatedWaitMinutes, snapshotGeneratedAt]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = estimatedWaitMinutes > 0
    ? Math.max(0, 100 - (secondsLeft / (estimatedWaitMinutes * 60)) * 100)
    : 100;

  return (
    <div className="text-center" aria-live="polite">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        Live countdown
      </p>
      <p className="mt-2 font-mono text-4xl font-bold tracking-wider text-foreground">
        {String(mins).padStart(2, '0')}
        <span className="animate-pulse text-primary">:</span>
        {String(secs).padStart(2, '0')}
      </p>
      <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        ≈ {formatWait(estimatedWaitMinutes)} total estimate
      </p>
    </div>
  );
}
