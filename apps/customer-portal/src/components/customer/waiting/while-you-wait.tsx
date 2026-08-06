'use client';

import { Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WhileYouWait({
  title = 'While you wait',
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)} aria-labelledby="while-you-wait-heading">
      <h2 id="while-you-wait-heading" className="text-sm font-semibold text-foreground">
        {title}
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="glass flex min-w-[140px] flex-col gap-2 rounded-xl p-3">
          <Clock className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold leading-tight">Relax nearby</p>
          <p className="text-xs text-muted">We will notify you when it is your turn.</p>
        </div>
        <div className="glass flex min-w-[140px] flex-col gap-2 rounded-xl p-3">
          <Heart className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold leading-tight">Stay close</p>
          <p className="text-xs text-muted">Keep your phone handy for updates.</p>
        </div>
      </div>
    </section>
  );
}
