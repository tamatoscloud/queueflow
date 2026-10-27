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
      return 'bg-[#7a4b0c] text-white';
    case 'no_show':
    case 'skipped':
    case 'cancelled':
      return 'bg-[#9a3412] text-white';
    default:
      return 'bg-q-green text-white';
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

  if (urgent) {
    // Figma: lime "It's your turn!" card over the dimmed page, then the pass.
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-q-green/60 px-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="animate-quyk-pop w-full max-w-sm rounded-[26px] bg-q-lime px-6 pb-6 pt-6 text-center text-q-green shadow-2xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-q-green text-q-lime">
            <BellRing className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.02em]">{detail.title}</p>
          {detail.body ? <p className="mt-1 text-[16px] font-medium">{detail.body}</p> : null}
          <p className="mx-auto mt-4 w-fit rounded-full bg-q-green px-4 py-1.5 text-[12px] font-semibold text-q-lime">
            Taking you to your queue pass…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4" role="alert" aria-live="assertive">
      <div
        className={cn(
          'flex w-full max-w-md items-start gap-3 rounded-[18px] px-4 py-3 shadow-xl',
          toneForKind(detail.kind),
        )}
      >
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-q-lime" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{detail.title}</p>
          {detail.body ? <p className="mt-0.5 text-[14px] text-white/85">{detail.body}</p> : null}
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
