import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/queue/status-badge';
import type { EntryStatus } from '@/lib/api/types';

type WalletPassProps = {
  businessName: string;
  branchName?: string;
  token: string;
  status: string;
  position?: number;
  customersAhead?: number;
  estimatedWaitMinutes?: number;
  className?: string;
};

/** Apple Wallet–inspired digital queue ticket. */
export function WalletPass({
  businessName,
  branchName,
  token,
  status,
  position,
  customersAhead,
  estimatedWaitMinutes,
  className,
}: WalletPassProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] shadow-lg animate-fade-in-up',
        className,
      )}
      aria-label={`Queue pass for ${businessName}, token ${token}`}
    >
      {/* Top gradient header */}
      <div className="bg-gradient-to-br from-primary via-accent-purple to-secondary px-6 pb-16 pt-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
              QueueFlow Pass
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight">{businessName}</h2>
            {branchName ? (
              <p className="mt-0.5 text-sm text-white/80">{branchName}</p>
            ) : null}
          </div>
          <StatusBadge entryStatus={status as EntryStatus} />
        </div>
      </div>

      {/* Ticket body */}
      <div className="relative -mt-10 mx-3 rounded-2xl border border-border bg-surface px-6 py-8 shadow-md">
        {/* Perforation dots */}
        <div
          className="pointer-events-none absolute -top-3 left-0 right-0 flex justify-between px-4"
          aria-hidden
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-background shadow-inner"
            />
          ))}
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Your number
        </p>
        <p className="mt-2 text-center font-mono text-6xl font-black tracking-wider text-foreground">
          {token}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Position</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {position != null ? `#${position}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ahead</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {customersAhead != null ? customersAhead : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Est. wait</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {estimatedWaitMinutes != null ? `${estimatedWaitMinutes}m` : '—'}
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Show this pass when your number is called
        </p>
      </div>

      {/* Bottom stub */}
      <div className="mx-3 mt-1 rounded-b-2xl bg-gradient-to-r from-primary/10 to-accent-purple/10 px-6 py-3 text-center">
        <p className="text-xs font-medium text-muted">Powered by QueueFlow</p>
      </div>
    </div>
  );
}
