import { cn } from '@/lib/utils';

export function TokenDisplay({
  code,
  className,
  variant = 'full',
}: {
  code: string;
  className?: string;
  variant?: 'full' | 'code-only';
}) {
  if (variant === 'code-only') {
    return (
      <p
        className={cn('font-mono text-4xl font-bold tracking-wider text-foreground', className)}
        aria-label={`Queue token ${code}`}
      >
        {code}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'animate-token-glow rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-q-green-muted/5 px-6 py-10 text-center',
        className,
      )}
      aria-label={`Queue token ${code}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your token</p>
      <p className="mt-3 font-mono text-5xl font-bold tracking-wider text-foreground">{code}</p>
      <p className="mt-2 text-sm text-muted">Show this when called</p>
    </div>
  );
}
