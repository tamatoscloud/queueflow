import { cn, formatWait } from '@/lib/utils';

export function QueueStatsGrid({
  waitingCount,
  estimatedWaitMinutes,
  isOpen,
  className,
}: {
  waitingCount: number;
  estimatedWaitMinutes: number;
  isOpen: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      <StatCard label="Waiting" value={String(waitingCount)} icon="👥" />
      <StatCard label="Est. wait" value={formatWait(estimatedWaitMinutes)} icon="⏱" />
      <StatCard
        label="Status"
        value={isOpen ? 'Open' : 'Closed'}
        highlight={isOpen}
        icon={isOpen ? '✓' : '—'}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-4 text-center shadow-sm transition-all hover:shadow-md">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-bold tracking-tight',
          highlight ? 'text-success' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {icon && (
        <span className="mt-1 block text-xs opacity-40" aria-hidden>
          {icon}
        </span>
      )}
    </div>
  );
}
