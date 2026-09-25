'use client';

import { ArrowRight } from 'lucide-react';
import { AnimatedCounter } from '@/components/queue/animated-counter';
import { GlassCard } from '@/components/customer/primitives';

type ReturningCustomerCardProps = {
  displayCode: string;
  estimatedWaitMinutes?: number;
  onContinue: () => void;
  onJoinAsSomeoneElse?: () => void;
};

export function ReturningCustomerCard({
  displayCode,
  estimatedWaitMinutes,
  onContinue,
  onJoinAsSomeoneElse,
}: ReturningCustomerCardProps) {
  return (
    <GlassCard className="animate-fade-in-up border-success/20 bg-success/5">
      <p className="text-xs font-bold uppercase tracking-widest text-success">You&apos;re already in the queue</p>
      <p className="mt-2 font-mono text-2xl font-black text-foreground">{displayCode}</p>
      {estimatedWaitMinutes !== undefined ? (
        <p className="mt-1 text-sm text-muted">
          Estimated wait{' '}
          <span className="font-semibold text-foreground">
            {estimatedWaitMinutes !== undefined && estimatedWaitMinutes > 0 ? (
              <>
                ~<AnimatedCounter value={estimatedWaitMinutes} duration={300} /> min
              </>
            ) : (
              'Soon'
            )}
          </span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        Continue tracking
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      {onJoinAsSomeoneElse ? (
        <button
          type="button"
          onClick={onJoinAsSomeoneElse}
          className="mt-3 w-full text-center text-sm font-medium text-primary"
        >
          Join as someone else
        </button>
      ) : null}
    </GlassCard>
  );
}
