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
        'rounded-[22px] border p-4',
        highlighted
          ? 'border-transparent bg-q-lime-tint'
          : 'border-q-line bg-white',
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
        variant === 'primary' && 'bg-q-green text-q-lime',
        variant === 'secondary' && 'border-[1.5px] border-q-green bg-transparent text-q-green',
        variant === 'ghost' && 'text-q-green',
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
        className={cn('h-2 w-2 rounded-full', isLive ? 'bg-q-lime' : 'bg-muted/50')}
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
    <h1 className={cn('text-[30px] font-semibold leading-tight tracking-[-0.03em] text-q-green', className)}>
      {children}
      {accent ? <span className="text-primary">{accent}</span> : null}
    </h1>
  );
}

export function CalmSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{children}</p>
  );
}
