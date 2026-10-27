'use client';

import { Sparkles } from 'lucide-react';
import { AnimatedCounter } from '@/components/queue/animated-counter';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn, formatWait } from '@/lib/utils';

export function AlmostYourTurn({
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
  const ahead =
    customersAhead === 1
      ? `1 ${copy.aheadLabelSingular}`
      : `${customersAhead} ${copy.aheadLabel}`;

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-q-green-muted/10 p-5 text-center shadow-sm',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center justify-center gap-2 text-lg font-bold text-primary">
        <Sparkles className="h-5 w-5" aria-hidden />
        {copy.almostTitle}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
        <AnimatedCounter value={customersAhead} duration={280} />
        <span className="ml-1 text-base font-semibold">{ahead}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        ~{formatWait(estimatedWaitMinutes)} · Please stay nearby
      </p>
    </div>
  );
}
