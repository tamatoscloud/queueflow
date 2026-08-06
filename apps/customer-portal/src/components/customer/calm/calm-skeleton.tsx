export function CalmSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-40 rounded-2xl bg-[#eae5f8]/60" />
      <div className="h-24 rounded-2xl bg-[#eae5f8]/40" />
      <div className="h-14 rounded-full bg-[#eae5f8]/50" />
      <div className="h-32 rounded-2xl bg-[#eae5f8]/40" />
    </div>
  );
}
