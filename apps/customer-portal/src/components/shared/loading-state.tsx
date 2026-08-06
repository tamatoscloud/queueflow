import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4 animate-fade-in-up" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="glass space-y-3 rounded-2xl p-5">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="glass overflow-hidden rounded-[28px] p-0" aria-busy="true">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="mx-auto h-4 w-24" />
        <Skeleton className="mx-auto h-16 w-40" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    </div>
  );
}
