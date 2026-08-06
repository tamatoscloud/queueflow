'use client';

import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { formatConnectionLabel } from '@/lib/waiting/wait-helpers';
import { cn } from '@/lib/utils';

export function RealtimeIndicator({
  connection,
  className,
}: {
  connection: RealtimeConnectionState;
  className?: string;
}) {
  const label = formatConnectionLabel(connection);
  const isLive = connection === 'connected';
  const isReconnecting = connection === 'connecting' || connection === 'reconnecting';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
        isLive && 'bg-success-light text-success',
        isReconnecting && 'bg-warning-light text-warning',
        !isLive && !isReconnecting && 'bg-neutral-100 text-muted',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isLive && 'bg-success animate-pulse',
          isReconnecting && 'bg-warning',
          !isLive && !isReconnecting && 'bg-muted',
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
