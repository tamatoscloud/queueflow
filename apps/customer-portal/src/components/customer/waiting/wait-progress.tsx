'use client';

import { ProgressRing } from '@/components/queue/progress-ring';
import { computeWaitProgress } from '@/lib/waiting/wait-helpers';
import { formatWait } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function WaitProgress({
  initialCustomersAhead,
  currentCustomersAhead,
  initialWaitMinutes,
  currentWaitMinutes,
  className,
}: {
  initialCustomersAhead: number;
  currentCustomersAhead: number;
  initialWaitMinutes: number;
  currentWaitMinutes: number;
  className?: string;
}) {
  const progress = computeWaitProgress(initialCustomersAhead, currentCustomersAhead);

  return (
    <div className={cn('glass flex flex-col items-center gap-3 rounded-2xl p-5', className)}>
      <p className="text-sm font-semibold text-foreground">You&apos;ve made it</p>
      <ProgressRing progress={progress} label={`${progress}%`} sublabel="through the wait" />
      {initialWaitMinutes > 0 ? (
        <p className="text-center text-xs text-muted">
          Started around {formatWait(initialWaitMinutes)} · Now ~{formatWait(currentWaitMinutes)}
        </p>
      ) : (
        <p className="text-center text-xs text-muted">Now ~{formatWait(currentWaitMinutes)}</p>
      )}
    </div>
  );
}
