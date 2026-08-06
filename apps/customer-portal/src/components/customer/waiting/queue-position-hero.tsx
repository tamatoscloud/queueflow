'use client';

import { AnimatedCounter } from '@/components/queue/animated-counter';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

export function QueuePositionHero({
  customersAhead,
  estimatedWaitMinutes,
  copy,
  className,
}: {
  customersAhead: number;
  estimatedWaitMinutes: number;
  copy: ServiceModeCopy;
  className?: string;
}) {
  const aheadLabel =
    customersAhead === 1
      ? copy.aheadLabelSingular.toUpperCase()
      : copy.aheadLabel.toUpperCase();

  return (
    <section
      className={cn('grid grid-cols-2 gap-3', className)}
      aria-label="Queue status summary"
    >
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-5xl font-black tabular-nums tracking-tight text-foreground">
          <AnimatedCounter value={customersAhead} duration={280} />
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {aheadLabel}
        </p>
      </div>
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-5xl font-black tabular-nums tracking-tight text-primary">
          {estimatedWaitMinutes > 0 ? (
            <>
              ~<AnimatedCounter value={estimatedWaitMinutes} duration={280} />
            </>
          ) : (
            'Soon'
          )}
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {estimatedWaitMinutes > 0 ? 'EST. MIN' : 'EST. WAIT'}
        </p>
      </div>
    </section>
  );
}
