'use client';

import { Check } from 'lucide-react';
import type { JourneyStep } from '@/lib/waiting/wait-helpers';
import { journeyStepLabel } from '@/lib/waiting/wait-helpers';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

const ORDER: JourneyStep[] = ['joined', 'confirmed', 'waiting', 'almost', 'ready', 'seated'];

function stepIndex(step: JourneyStep): number {
  return ORDER.indexOf(step);
}

export function QueueJourneyTimeline({
  currentStep,
  copy,
}: {
  currentStep: JourneyStep;
  copy: ServiceModeCopy;
}) {
  const currentIdx = stepIndex(currentStep);
  const steps = ORDER.map((id) => ({ id, label: journeyStepLabel(id, copy) }));

  return (
    <ol className="glass space-y-0 rounded-2xl p-4" aria-label="Queue journey">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const pending = i > currentIdx;

        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  done && 'bg-success text-white',
                  active && 'bg-primary text-white ring-4 ring-primary/20',
                  pending && 'border-2 border-border bg-surface text-muted',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : active ? '●' : '○'}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={cn('my-0.5 h-4 w-px', done ? 'bg-success' : 'bg-border')}
                  aria-hidden
                />
              ) : null}
            </div>
            <span
              className={cn(
                'pb-3 text-sm',
                active && 'font-semibold text-foreground',
                done && 'text-muted',
                pending && 'text-muted',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
