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
    const holdMs =
      detail.kind === 'called' || detail.kind === 'recalled' ? 20_000 : 10_000;
    const t = window.setTimeout(() => setDetail(null), holdMs);
    return () => window.clearTimeout(t);
  }, [detail]);

  if (!detail) return null;

  const urgent = detail.kind === 'called' || detail.kind === 'recalled';

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-50 flex justify-center px-4',
        urgent ? 'inset-0 items-center bg-black/50' : 'top-3',
      )}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={cn(
          'flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-xl',
          urgent && 'flex-col items-center px-6 py-6 text-center shadow-2xl ring-4 ring-white/25',
          toneForKind(detail.kind),
        )}
      >
        <BellRing className={cn('mt-0.5 h-5 w-5 shrink-0', urgent && 'mt-0 h-8 w-8')} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn('font-bold', urgent && 'text-2xl')}>{detail.title}</p>
          {detail.body ? (
            <p className={cn('mt-0.5 text-sm text-white/90', urgent && 'mt-2 text-base')}>
              {detail.body}
            </p>
          ) : null}
          {urgent ? (
            <p className="mt-4 text-sm font-semibold text-white/95">
              Taking you back to your queue pass…
            </p>
          ) : null}
        </div>
        {!urgent ? (
          <button
            type="button"
            className="rounded-lg p-1 hover:bg-white/15"
            aria-label="Dismiss"
            onClick={() => setDetail(null)}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
