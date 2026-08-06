export function PageShell({
  children,
  gradient,
  stickyHeader,
}: {
  children: React.ReactNode;
  gradient?: boolean;
  stickyHeader?: boolean;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col noise-texture">
      {gradient && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-accent-purple/5 to-transparent"
            aria-hidden
          />
          <div
            className="animate-float-blob pointer-events-none absolute -right-20 top-20 h-48 w-48 rounded-full bg-secondary/20 blur-3xl"
            aria-hidden
          />
          <div
            className="animate-float-blob pointer-events-none absolute -left-16 top-40 h-40 w-40 rounded-full bg-primary/15 blur-3xl [animation-delay:2s]"
            aria-hidden
          />
        </>
      )}
      <main
        className={`relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6 ${
          stickyHeader ? 'pt-4' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}
