type BookingShellProps = {
  children: React.ReactNode;
  venueName?: string;
  showJazzPill?: boolean;
};

export function BookingShell({ children, venueName, showJazzPill }: BookingShellProps) {
  const title = venueName ?? 'QueueFlow';

  return (
    <div className="booking-light flex min-h-full flex-1 flex-col bg-[#faf8f5] text-[#17151a]">
      <header className="border-b border-[#e8e3e8] px-5 pb-4 pt-6">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[#17151a]">{title}</p>
            {venueName ? (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#6b6870]">
                Powered by QueueFlow
              </p>
            ) : null}
          </div>
          {showJazzPill ? (
            <div className="flex items-center gap-2 rounded-full border border-[#e8e3e8] bg-white px-3 py-1.5 text-xs text-[#6b6870] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              <span>Live</span>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">{children}</main>
      <footer className="border-t border-[#e8e3e8] px-5 py-4 text-[10px] text-[#6b6870]">
        <div className="mx-auto flex max-w-md justify-between">
          <span>QueueFlow</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
