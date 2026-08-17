type BookingShellProps = {
  children: React.ReactNode;
  venueName?: string;
  showJazzPill?: boolean;
  tone?: 'default' | 'called';
};

export function BookingShell({
  children,
  venueName,
  showJazzPill,
  tone = 'default',
}: BookingShellProps) {
  const title = venueName ?? 'QueueFlow';
  const called = tone === 'called';

  return (
    <div
      className={
        called
          ? 'flex min-h-full flex-1 flex-col bg-primary text-white'
          : 'booking-light flex min-h-full flex-1 flex-col bg-[var(--neutral-50)] text-foreground'
      }
    >
      <header
        className={
          called
            ? 'border-b border-white/20 px-5 pb-4 pt-6'
            : 'border-b border-border px-5 pb-4 pt-6'
        }
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div>
            <p
              className={
                called
                  ? 'text-2xl font-bold tracking-tight text-white'
                  : 'text-2xl font-bold tracking-tight text-foreground'
              }
            >
              {title}
            </p>
            {venueName ? (
              <p
                className={
                  called
                    ? 'mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80'
                    : 'mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted'
                }
              >
                Powered by QueueFlow
              </p>
            ) : null}
          </div>
          {showJazzPill ? (
            <div
              className={
                called
                  ? 'flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white'
                  : 'flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-sm'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${called ? 'bg-white' : 'bg-emerald-500'}`}
                aria-hidden
              />
              <span>Live</span>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">{children}</main>
      <footer
        className={
          called
            ? 'border-t border-white/20 px-5 py-4 text-[10px] text-white/70'
            : 'border-t border-border px-5 py-4 text-[10px] text-muted'
        }
      >
        <div className="mx-auto flex max-w-md justify-between">
          <span>QueueFlow</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
