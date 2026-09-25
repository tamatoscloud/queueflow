'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatedCounter } from '@/components/queue/animated-counter';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

export function QueuePositionLadder({
  position,
  customersAhead,
  copy,
  className,
}: {
  position: number;
  customersAhead: number;
  copy: ServiceModeCopy;
  className?: string;
}) {
  const readyLabel = copy.timeline.ready.toUpperCase();

  const ladder = [readyLabel, '#1', '#2', '#3', '#4'] as const;
  const prevPosition = useRef(position);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (position < prevPosition.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      prevPosition.current = position;
      return () => clearTimeout(t);
    }
    prevPosition.current = position;
  }, [position]);

  const highlightIndex =
    customersAhead === 0 ? 0 : Math.min(ladder.length - 1, Math.max(1, customersAhead));

  return (
    <div className={cn('glass rounded-2xl p-4', className)} aria-label="Position progress">
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
        {copy.positionLadderTitle}
      </p>
      <div className="flex flex-col items-center gap-1">
        {ladder.slice(0, Math.max(3, highlightIndex + 1)).map((step, i) => {
          const isActive = i === highlightIndex;
          const isReady = i === 0 && customersAhead === 0;
          return (
            <div key={`${step}-${i}`} className="flex flex-col items-center">
              <span
                className={cn(
                  'rounded-xl px-4 py-1.5 text-sm font-bold transition-all duration-300',
                  isActive || isReady
                    ? 'scale-105 bg-primary text-[var(--on-primary)] shadow-md'
                    : 'text-muted',
                  bump && isActive && 'animate-success-pop',
                )}
              >
                {step.startsWith('#') ? (
                  <AnimatedCounter value={position} duration={280} prefix="#" />
                ) : (
                  step
                )}
              </span>
              {i < highlightIndex ? (
                <span className="my-0.5 text-muted" aria-hidden>
                  ↓
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
