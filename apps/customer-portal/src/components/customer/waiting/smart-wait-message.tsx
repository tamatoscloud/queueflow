'use client';

import type { EntryStatus, ServiceMode } from '@/lib/api/types';
import { getSmartWaitMessage } from '@/lib/waiting/wait-helpers';
import { cn } from '@/lib/utils';

export function SmartWaitMessage({
  status,
  customersAhead,
  mode,
  className,
}: {
  status: EntryStatus;
  customersAhead: number;
  mode?: ServiceMode;
  className?: string;
}) {
  const message = getSmartWaitMessage(status, customersAhead, mode);

  return (
    <p
      className={cn(
        'text-center text-base font-medium text-foreground',
        customersAhead <= 1 && status === 'WAITING' && 'text-primary',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
