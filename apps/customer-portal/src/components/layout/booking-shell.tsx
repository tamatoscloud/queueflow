import { Music2 } from 'lucide-react';
import { QuykMarkTile } from '@/components/quyk/ui';
import { cn } from '@/lib/utils';

type BookingShellProps = {
  children: React.ReactNode;
  venueName?: string;
  /** Lime "Jazz Music" pill (waiting screens). */
  showJazzPill?: boolean;
  variant?: 'default' | 'waiting' | 'called';
  tone?: 'default' | 'called';
};

function JazzPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-q-lime px-3 py-1.5 text-[12px] font-semibold text-q-green">
      <Music2 className="h-3.5 w-3.5" aria-hidden />
      Jazz Music
      <span className="ml-0.5 flex h-3 items-end gap-[2px]" aria-hidden>
        {[0, 140, 280].map((delay, i) => (
          <span
            key={delay}
            className="animate-quyk-eq inline-block w-[2px] rounded-full bg-q-green"
            style={{ height: [7, 11, 8][i], animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </span>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-q-green-panel px-2.5 py-1 text-[12px] font-semibold text-white">
      <span className="animate-pulse-glow h-2 w-2 rounded-full bg-q-lime" aria-hidden />
      Live
    </span>
  );
}

/**
 * Guest page frame from the Quyk redesign: Q tile, venue name and
 * "Powered by Quyk" on the left; Jazz Music (waiting) or Live (called) pill
 * on the right. Cream page by default; deep green when the guest is called.
 */
export function BookingShell({
  children,
  venueName,
  showJazzPill,
  variant,
  tone = 'default',
}: BookingShellProps) {
  const called = tone === 'called' || variant === 'called';
  const waiting = variant === 'waiting';
  const title = venueName ?? 'Quyk';

  return (
    <div
      className={cn(
        'flex min-h-full flex-1 flex-col',
        called ? 'booking-dark' : waiting ? 'booking-waiting' : 'booking-light',
      )}
    >
      <header className="px-5 pb-2 pt-5">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <QuykMarkTile tone={called ? 'dark' : 'light'} />
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-[17px] font-semibold leading-tight',
                  called ? 'text-white' : 'text-q-green',
                )}
              >
                {title}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                  called ? 'text-white/60' : 'text-q-subtle',
                )}
              >
                Powered by Quyk
              </p>
            </div>
          </div>
          {called ? <LivePill /> : showJazzPill && waiting ? <JazzPill /> : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-4">{children}</main>
    </div>
  );
}
