import Image from 'next/image';

type BookingShellProps = {
  children: React.ReactNode;
  venueName?: string;
  showJazzPill?: boolean;
  /** Waiting/track mockup: brand header + Jazz Music (screenshot). */
  variant?: 'default' | 'waiting' | 'called';
  tone?: 'default' | 'called';
};

export function BookingShell({
  children,
  venueName,
  showJazzPill,
  variant,
  tone = 'default',
}: BookingShellProps) {
  const waiting = variant === 'waiting';
  const called = tone === 'called' || variant === 'called';

  return (
    <div
      className={
        called
          ? 'flex min-h-full flex-1 flex-col bg-[var(--brand-forest)] text-[var(--primary)]'
          : waiting
            ? 'booking-waiting flex min-h-full flex-1 flex-col bg-white text-[#0c1613]'
            : 'booking-light flex min-h-full flex-1 flex-col bg-[var(--neutral-50)] text-foreground'
      }
    >
      <header
        className={
          called
            ? 'border-b border-white/10 px-5 pb-4 pt-6'
            : waiting
              ? 'border-b border-[#ececf0] px-5 pb-3.5 pt-5'
              : 'border-b border-border px-5 pb-4 pt-6'
        }
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div>
            {waiting ? (
              <Image
                src="/brand/quyk-logo.png"
                alt="Quyk"
                width={120}
                height={44}
                className="h-8 w-auto"
                priority
              />
            ) : (
              <>
                <p
                  className={
                    called
                      ? 'text-2xl font-bold tracking-tight text-[var(--primary)]'
                      : 'text-2xl font-bold tracking-tight text-foreground'
                  }
                >
                  {venueName ?? 'Quyk'}
                </p>
                {venueName && !called ? (
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                    Powered by Quyk
                  </p>
                ) : null}
              </>
            )}
          </div>
          {showJazzPill || waiting ? (
            waiting ? (
              <div className="flex items-center gap-1.5 rounded-full border border-[#ececf0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3f3f46] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <span className="text-[14px] leading-none text-[var(--brand-forest)]" aria-hidden>
                  ♫
                </span>
                <span>Jazz Music</span>
                <span className="ml-0.5 flex h-3 items-end gap-[2px]" aria-hidden>
                  <span
                    className="inline-block w-[2px] animate-pulse rounded-full bg-[var(--brand-forest)]"
                    style={{ height: 6 }}
                  />
                  <span
                    className="inline-block w-[2px] animate-pulse rounded-full bg-[var(--brand-forest)]"
                    style={{ height: 10, animationDelay: '120ms' }}
                  />
                  <span
                    className="inline-block w-[2px] animate-pulse rounded-full bg-[var(--brand-forest)]"
                    style={{ height: 7, animationDelay: '240ms' }}
                  />
                </span>
              </div>
            ) : (
              <div
                className={
                  called
                    ? 'flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1.5 text-xs text-[var(--primary)]'
                    : 'flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-sm'
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${called ? 'bg-[var(--primary)]' : 'bg-emerald-500'}`}
                  aria-hidden
                />
                <span>Live</span>
              </div>
            )
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-5">{children}</main>
      <footer
        className={
          called
            ? 'border-t border-white/10 px-5 py-4 text-[10px] text-[var(--primary)]/70'
            : waiting
              ? 'border-t border-[#ececf0] px-5 py-3.5 text-[10px] text-[#9ca3af]'
              : 'border-t border-border px-5 py-4 text-[10px] text-muted'
        }
      >
        <div className="mx-auto flex max-w-md justify-between">
          <span>{waiting ? 'v1.0.0.1' : 'Quyk'}</span>
          <span>{waiting ? '© 2026 Quyk' : '© 2026'}</span>
        </div>
      </footer>
    </div>
  );
}
