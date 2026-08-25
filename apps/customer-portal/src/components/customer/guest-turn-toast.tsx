'use client';

import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TurnDetail = {
  title: string;
  body?: string;
  kind?: string;
};

function toneForKind(kind?: string): string {
  switch (kind) {
    case 'holding':
      return 'bg-amber-600';
    case 'no_show':
    case 'skipped':
    case 'cancelled':
      return 'bg-rose-600';
    case 'completed':
      return 'bg-sky-700';
    default:
      return 'bg-emerald-600';
  }
}

/** In-page toast for staff actions (works without SMS/WhatsApp). */
export function GuestTurnToast() {
  const [detail, setDetail] = useState<TurnDetail | null>(null);

  useEffect(() => {
    const onTurn = (event: Event) => {
      const custom = event as CustomEvent<TurnDetail>;
      setDetail({
        title: custom.detail?.title ?? "It's your turn!",
        body: custom.detail?.body,
        kind: custom.detail?.kind,
      });
    };
    window.addEventListener('queueflow:guest-turn', onTurn);
    return () => window.removeEventListener('queueflow:guest-turn', onTurn);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const t = window.setTimeout(() => setDetail(null), 10_000);
    return () => window.clearTimeout(t);
  }, [detail]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-4"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={cn(
          'flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-xl',
          toneForKind(detail.kind),
        )}
      >
        <BellRing className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{detail.title}</p>
          {detail.body ? <p className="mt-0.5 text-sm text-white/90">{detail.body}</p> : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-1 hover:bg-white/15"
          aria-label="Dismiss"
          onClick={() => setDetail(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
