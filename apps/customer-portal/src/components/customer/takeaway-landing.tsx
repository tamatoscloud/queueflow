'use client';

import { Clock, Package, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { QueueLanding } from '@/lib/api/types';
import { GlassCard } from '@/components/customer/primitives';
import { StatusBadge } from '@/components/queue/status-badge';
import { Button } from '@/components/ui/button';
import { formatWait } from '@/lib/utils';

export function TakeawayLanding({ data, queueId }: { data: QueueLanding; queueId: string }) {
  const router = useRouter();
  const canTrack = data.live.isOpen && data.queue.isAcceptingEntries;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4 animate-fade-in-up">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning to-primary shadow-glow">
          <Package className="h-7 w-7 text-white" aria-hidden />
        </div>
        <h1 className="text-2xl font-black">{data.business.name}</h1>
        <p className="text-sm text-muted">Takeaway · {data.branch.name}</p>
        <div className="mt-3 flex justify-center">
          <StatusBadge queueStatus={data.queue.status} isOpen={data.live.isOpen} />
        </div>
      </div>

      <GlassCard className="!p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Kitchen status</p>
        <p className="mt-2 text-3xl font-black text-primary">
          {data.live.waitingCount > 0 ? 'Preparing orders' : 'Ready when you are'}
        </p>
        <p className="mt-1 text-sm text-muted">
          Avg prep {formatWait(data.live.averageServiceTimeMinutes)}
        </p>
      </GlassCard>

      <GlassCard className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted">
          Scan the QR on your receipt, enter your phone, and track preparing → ready → collected.
        </p>
      </GlassCard>

      <Button
        variant="gradient"
        size="lg"
        className="h-14 w-full rounded-2xl font-bold"
        disabled={!canTrack}
        onClick={() => router.push(`/q/${queueId}/join`)}
      >
        Track my order
      </Button>

      <GlassCard className="flex items-center gap-3 text-sm text-muted">
        <Clock className="h-4 w-4 text-primary" aria-hidden />
        No queue position — just kitchen progress updates.
      </GlassCard>
    </div>
  );
}
