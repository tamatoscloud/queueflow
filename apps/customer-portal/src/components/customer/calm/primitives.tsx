import { cn } from '@/lib/utils';

export function CalmCard({
  children,
  className,
  highlighted,
}: {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        highlighted
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-surface',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CalmButton({
  children,
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-semibold transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-[var(--on-primary)] shadow-sm',
        variant === 'secondary' && 'border border-border bg-surface text-foreground',
        variant === 'ghost' && 'text-[var(--brand-forest)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CalmLivePill({ label }: { label: string }) {
  const isLive = label === 'Live';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      <span
        className={cn('h-2 w-2 rounded-full', isLive ? 'bg-emerald-500' : 'bg-muted/50')}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function CalmHeading({
  children,
  accent,
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <h1 className={cn('text-3xl font-bold leading-tight text-foreground', className)}>
      {children}
      {accent ? <span className="text-[var(--brand-forest)]">{accent}</span> : null}
    </h1>
  );
}

export function CalmSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{children}</p>
  );
}
