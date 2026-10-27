'use client';

import { Car, MapPin, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { QueueLanding } from '@/lib/api/types';
import { GlassCard } from '@/components/customer/primitives';
import { StatusBadge } from '@/components/queue/status-badge';
import { Button } from '@/components/ui/button';

export function DriveInLanding({ data, queueId }: { data: QueueLanding; queueId: string }) {
  const router = useRouter();
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4 animate-fade-in-up">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-primary shadow-glow">
          <Car className="h-7 w-7 text-white" aria-hidden />
        </div>
        <h1 className="text-2xl font-black">{data.business.name}</h1>
        <p className="text-sm text-muted">Drive-In · {data.branch.name}</p>
        <div className="mt-3 flex justify-center">
          <StatusBadge queueStatus={data.queue.status} isOpen={data.live.isOpen} />
        </div>
      </div>

      <GlassCard className="!p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Pickup lane</p>
        <p className="mt-2 text-lg font-bold">Scan your waiter&apos;s QR or join the drive queue</p>
        <p className="mt-2 text-sm text-muted">
          {data.live.waitingCount} car{data.live.waitingCount === 1 ? '' : 's'} waiting
        </p>
      </GlassCard>

      <div className="grid gap-3">
        <GlassCard className="flex items-start gap-3">
          <UserCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold">Waiter assigned</p>
            <p className="text-sm text-muted">Your waiter will scan and link your vehicle & order.</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-start gap-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold">Arrival instructions</p>
            <p className="text-sm text-muted">Pull up to the marked lane. Stay in your vehicle.</p>
          </div>
        </GlassCard>
      </div>

      <Button
        variant="default"
        size="lg"
        className="h-14 w-full rounded-2xl font-bold"
        disabled={!canJoin}
        onClick={() => router.push(`/q/${queueId}/join`)}
      >
        Join drive queue
      </Button>
    </div>
  );
}
