'use client';

import { AnimatedCounter } from '@/components/queue/animated-counter';
import type { ServiceMode } from '@/lib/api/types';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { formatWait } from '@/lib/utils';
import { cn } from '@/lib/utils';

type QueueSummaryProps = {
  businessName: string;
  partySize: number;
  estimatedWaitMinutes: number;
  serviceMode?: ServiceMode;
  className?: string;
};

export function QueueSummary({
  businessName,
  partySize,
  estimatedWaitMinutes,
  serviceMode,
  className,
}: QueueSummaryProps) {
  const copy = getServiceModeCopy(serviceMode);
  const waitLabel = formatWait(estimatedWaitMinutes);
  const showParty = serviceMode !== 'TAKEAWAY';

  return (
    <div
      className={cn(
        'glass animate-fade-in-up rounded-2xl border border-white/30 p-4 shadow-md transition-all duration-300',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-muted">Your queue</p>
      <p className="mt-1 text-base font-bold text-foreground">{businessName}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        {showParty ? (
          <div>
            <p className="text-2xl font-black text-foreground">
              {partySize} {partySize === 1 ? 'person' : 'people'}
            </p>
            <p className="text-xs text-muted">
              {serviceMode === 'DRIVE_IN' ? 'In vehicle' : 'Party size'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-black text-foreground">Pickup</p>
            <p className="text-xs text-muted">Order queue</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-primary">
            {estimatedWaitMinutes > 0 ? (
              <>
                ~<AnimatedCounter value={estimatedWaitMinutes} duration={300} />
                <span className="text-lg"> min</span>
              </>
            ) : (
              'Soon'
            )}
          </p>
          <p className="text-xs text-muted">Estimated wait</p>
        </div>
      </div>
      <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted">{copy.joinNotifyMessage}</p>
      <p className="sr-only">
        {businessName}, estimated wait {waitLabel}
      </p>
    </div>
  );
}
