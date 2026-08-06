'use client';

import type { ServiceMode } from '@/lib/api/types';
import { TokenDisplay } from '@/components/queue/token-display';
import { RealtimeIndicator } from '@/components/customer/waiting/realtime-indicator';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { formatAhead } from '@/lib/restaurant/service-mode-config';
import { formatWait } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function QueueWalletPass({
  restaurantName,
  customerName,
  displayCode,
  partySize,
  customersAhead,
  estimatedWaitMinutes,
  connection,
  copy,
  serviceMode = 'DINE_IN',
  className,
}: {
  restaurantName: string;
  customerName?: string | null;
  displayCode: string;
  partySize: number;
  customersAhead: number;
  estimatedWaitMinutes: number;
  connection: RealtimeConnectionState;
  copy: ServiceModeCopy;
  serviceMode?: ServiceMode;
  className?: string;
}) {
  const aheadText = formatAhead(customersAhead, copy);
  const showParty = serviceMode !== 'TAKEAWAY';

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-surface to-primary/5 p-5 shadow-xl',
        'before:absolute before:left-6 before:right-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border before:to-transparent',
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-8 after:bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,var(--border)_6px,var(--border)_12px)] after:opacity-30',
        className,
      )}
      aria-label="Digital waiting pass"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative space-y-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              {restaurantName}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{copy.queueLabel}</p>
          </div>
          <RealtimeIndicator connection={connection} />
        </header>

        <div className="text-center">
          <TokenDisplay code={displayCode} variant="code-only" />
        </div>

        <div className={cn('grid gap-3 text-center text-sm', showParty ? 'grid-cols-2' : 'grid-cols-1')}>
          {showParty ? (
            <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
              <p className="text-xs text-muted">
                {serviceMode === 'DRIVE_IN' ? 'In vehicle' : 'Party'}
              </p>
              <p className="font-bold text-foreground">
                {partySize} {partySize === 1 ? 'person' : 'people'}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl bg-white/70 px-3 py-2 shadow-sm">
            <p className="text-xs text-muted">Wait</p>
            <p className="font-bold text-foreground">~{formatWait(estimatedWaitMinutes)}</p>
          </div>
        </div>

        <p className="text-center text-sm font-semibold text-primary">{aheadText}</p>

        {customerName ? (
          <p className="text-center text-xs text-muted">{customerName}</p>
        ) : null}
      </div>
    </article>
  );
}
