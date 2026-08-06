'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RestaurantInfoPanel({
  businessName,
  branchName,
  className,
}: {
  businessName: string;
  branchName: string;
  className?: string;
}) {
  return (
    <section className={cn('glass rounded-2xl p-4', className)} aria-label="Venue details">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">Venue</p>
      <p className="mt-1 text-base font-bold text-foreground">{businessName}</p>
      <p className="mt-2 flex items-start gap-2 text-sm text-muted">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{branchName}</span>
      </p>
      <p className="mt-3 text-xs text-muted">
        Need directions or help? Ask a team member at the venue.
      </p>
    </section>
  );
}
