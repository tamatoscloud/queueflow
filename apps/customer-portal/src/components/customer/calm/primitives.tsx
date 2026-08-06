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
          ? 'border-[#8b7cf8]/30 bg-[#f5f3ff]'
          : 'border-[#e8e3e8] bg-white',
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
        'flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-semibold transition-opacity hover:opacity-95 disabled:opacity-50',
        variant === 'primary' && 'bg-[#8b7cf8] text-white shadow-sm',
        variant === 'secondary' && 'border border-[#e8e3e8] bg-white text-[#17151a]',
        variant === 'ghost' && 'text-[#8b7cf8]',
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
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b6870]">
      <span
        className={cn('h-2 w-2 rounded-full', isLive ? 'bg-emerald-500' : 'bg-[#6b6870]/50')}
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
    <h1 className={cn('font-display text-3xl font-bold leading-tight text-[#17151a]', className)}>
      {children}
      {accent ? <span className="text-[#8b7cf8]">{accent}</span> : null}
    </h1>
  );
}

export function CalmSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b6870]">{children}</p>
  );
}
