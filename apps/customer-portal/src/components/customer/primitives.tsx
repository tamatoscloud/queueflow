import { cn } from '@/lib/utils';

export function GlassCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl border border-white/20 p-5 shadow-md transition-all duration-300',
        onClick && 'active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="animate-float-blob absolute h-32 w-32 rounded-full opacity-30 blur-3xl"
          style={{
            background: i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
            left: `${10 + i * 15}%`,
            top: `${5 + (i % 3) * 20}%`,
            animationDelay: `${i * 1.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            i < step ? 'bg-primary' : i === step ? 'bg-primary/50' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}
