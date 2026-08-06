'use client';

import { Button } from '@/components/ui/button';
import { formatWait } from '@/lib/utils';
import { cn } from '@/lib/utils';

type JoinQueueCTAProps = {
  partySize: number;
  estimatedWaitMinutes: number;
  isSubmitting: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function JoinQueueCTA({
  partySize,
  estimatedWaitMinutes,
  isSubmitting,
  disabled,
  className,
  label = 'Join the queue',
}: JoinQueueCTAProps) {
  const waitLabel = formatWait(estimatedWaitMinutes);
  const subtitle =
    estimatedWaitMinutes > 0
      ? `${partySize} ${partySize === 1 ? 'person' : 'people'} · ~${waitLabel}`
      : `${partySize} ${partySize === 1 ? 'person' : 'people'}`;

  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-4 border-t border-border/60 bg-background/90 px-4 pb-4 pt-3 backdrop-blur-md sm:-mx-6 sm:px-6',
        className,
      )}
    >
      <Button
        type="submit"
        variant="gradient"
        size="lg"
        disabled={disabled || isSubmitting}
        className="h-14 w-full rounded-2xl text-base font-bold shadow-glow"
      >
        {isSubmitting ? (
          'Joining…'
        ) : (
          <span className="flex flex-col leading-tight">
            <span>{label}</span>
            <span className="text-xs font-medium opacity-90">{subtitle}</span>
          </span>
        )}
      </Button>
    </div>
  );
}
