'use client';

import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';

type TurnDetail = {
  title: string;
  body?: string;
};

/** In-page toast when staff calls the guest (works without SMS/WhatsApp). */
export function GuestTurnToast() {
  const [detail, setDetail] = useState<TurnDetail | null>(null);

  useEffect(() => {
    const onTurn = (event: Event) => {
      const custom = event as CustomEvent<TurnDetail>;
      setDetail({
        title: custom.detail?.title ?? "It's your turn!",
        body: custom.detail?.body,
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
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-xl">
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
