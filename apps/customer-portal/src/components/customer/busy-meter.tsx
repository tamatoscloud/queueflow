'use client';

import { BUSY_LABELS, busyLevel } from '@/lib/demo/restaurant-content';
import { cn } from '@/lib/utils';

export function BusyMeter({ waitingCount }: { waitingCount: number }) {
  const level = busyLevel(waitingCount);
  const bars = { quiet: 1, moderate: 2, busy: 3, very_busy: 4 }[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        level === 'very_busy' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning',
      )}
    >
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={cn('w-1 rounded-sm', b <= bars ? 'bg-current' : 'bg-current/20')}
            style={{ height: `${4 + b * 3}px` }}
          />
        ))}
      </span>
      {BUSY_LABELS[level]}
    </span>
  );
}
