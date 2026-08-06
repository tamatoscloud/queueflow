'use client';

import { AnimatedCounter } from '@/components/queue/animated-counter';
import { useRealtimeConnection } from '@/hooks/use-realtime-connection';
import type { ServiceMode } from '@/lib/api/types';
import { formatWaitingCount, getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { formatWait } from '@/lib/utils';
import { cn } from '@/lib/utils';

type LiveQueueStatusProps = {
  estimatedWaitMinutes: number;
  waitingCount: number;
  isOpen: boolean;
  serviceMode?: ServiceMode;
  className?: string;
};

export function LiveQueueStatus({
  estimatedWaitMinutes,
  waitingCount,
  isOpen,
  serviceMode,
  className,
}: LiveQueueStatusProps) {
  const connection = useRealtimeConnection();
  const isUpdating = connection === 'reconnecting' || connection === 'connecting';
  const copy = getServiceModeCopy(serviceMode);

  const waitLabel = formatWait(estimatedWaitMinutes);
  const waitDisplay = waitLabel === 'Soon' ? 'Soon' : `~${waitLabel}`;
  const waitingLabel = formatWaitingCount(waitingCount, copy);

  return (
    <div
      className={cn(
        'glass rounded-2xl border border-white/30 p-4 shadow-md transition-all duration-300',
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{copy.liveQueueTitle}</p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-foreground">
            {estimatedWaitMinutes > 0 ? (
              <>
                ~<AnimatedCounter value={estimatedWaitMinutes} duration={300} />
                <span className="text-2xl"> min</span>
              </>
            ) : (
              'Soon'
            )}
          </p>
          <p className="mt-1 text-sm text-muted capitalize">{waitingLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              isOpen ? 'bg-success-light text-success' : 'bg-danger-light text-danger',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isOpen ? 'bg-success animate-pulse' : 'bg-danger',
              )}
              aria-hidden
            />
            {isOpen ? (isUpdating ? 'Updating…' : 'Live') : 'Closed'}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted sr-only">
        Estimated wait {waitDisplay}, {waitingLabel}, queue {isOpen ? 'open' : 'closed'}
      </p>
    </div>
  );
}
