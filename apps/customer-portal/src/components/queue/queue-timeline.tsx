import { Check, Clock, Sparkles, UtensilsCrossed, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntryStatus } from '@/lib/api/types';

const STEPS = [
  { key: 'waiting', label: 'Waiting', icon: Clock },
  { key: 'almost', label: 'Almost Ready', icon: Sparkles },
  { key: 'preparing', label: 'Preparing Table', icon: UtensilsCrossed },
  { key: 'turn', label: 'Your Turn', icon: Bell },
  { key: 'completed', label: 'Completed', icon: Check },
] as const;

type TimelineStep = (typeof STEPS)[number]['key'];

function resolveActiveStep(
  status: EntryStatus,
  customersAhead: number,
): TimelineStep {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CALLED') return 'turn';
  if (status === 'HOLDING') return 'preparing';
  if (status === 'WAITING' && customersAhead <= 2) return 'almost';
  return 'waiting';
}

const STEP_ORDER: TimelineStep[] = ['waiting', 'almost', 'preparing', 'turn', 'completed'];

export function QueueTimeline({
  status,
  customersAhead,
  className,
}: {
  status: EntryStatus;
  customersAhead: number;
  className?: string;
}) {
  const activeStep = resolveActiveStep(status, customersAhead);
  const activeIndex = STEP_ORDER.indexOf(activeStep);

  return (
    <div className={cn('space-y-0', className)}>
      {STEPS.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        const isPending = index > activeIndex;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isComplete && 'border-success bg-success text-white',
                  isActive &&
                    'border-primary bg-gradient-to-br from-primary to-q-green-muted text-white shadow-glow scale-110',
                  isPending && 'border-border bg-surface text-muted',
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'my-1 w-0.5 flex-1 min-h-6 transition-colors duration-300',
                    isComplete ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('pb-6 pt-1.5', index === STEPS.length - 1 && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-semibold transition-colors',
                  isActive && 'text-primary',
                  isComplete && 'text-success',
                  isPending && 'text-muted',
                )}
              >
                {step.label}
              </p>
              {isActive && (
                <p className="mt-0.5 text-xs text-muted animate-fade-in-up">
                  {step.key === 'waiting' && 'You\'re in line — relax and we\'ll keep you updated'}
                  {step.key === 'almost' && 'Just a few parties ahead of you'}
                  {step.key === 'preparing' && 'Your table is being set up'}
                  {step.key === 'turn' && 'Please proceed to the host stand'}
                  {step.key === 'completed' && 'Enjoy your meal!'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function computeQueueProgress(
  status: EntryStatus,
  customersAhead: number,
  position: number,
): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'CALLED') return 95;
  if (status === 'HOLDING') return 80;
  if (customersAhead === 0) return 75;
  if (position <= 0) return 50;

  const baseProgress = Math.max(5, 70 - customersAhead * 12);
  return Math.min(70, baseProgress);
}
