'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

export function NeedHelp({
  displayCode,
  copy,
  className,
}: {
  displayCode: string;
  copy: ServiceModeCopy;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('text-center', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        aria-expanded={open}
      >
        Need help?
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="glass mt-3 space-y-2 rounded-2xl p-4 text-left text-sm">
          <p className="flex items-start gap-2 text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Contact the venue for assistance. Show staff your {copy.tokenLabel.toLowerCase()} if asked.
          </p>
          <p className="font-mono font-semibold text-foreground">{displayCode}</p>
        </div>
      ) : null}
    </div>
  );
}
