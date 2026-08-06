'use client';

import { Bell } from 'lucide-react';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

export function NotificationStatus({
  copy,
  className,
}: {
  copy: ServiceModeCopy;
  className?: string;
}) {
  return (
    <div
      className={cn('glass flex items-start gap-3 rounded-2xl p-4', className)}
      role="status"
    >
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-foreground">Text updates on</p>
        <p className="mt-0.5 text-xs text-muted">{copy.notificationHint}</p>
      </div>
    </div>
  );
}
