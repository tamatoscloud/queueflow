'use client';

import { useEffect, useRef } from 'react';

type NotifyOnStatusChangeOptions = {
  entryId: string;
  status: string | undefined;
  displayCode?: string;
  businessName?: string;
  readyTitle?: string;
};

/**
 * When staff calls the guest, surface an in-app / browser notification
 * even if SMS/WhatsApp credentials are not configured.
 */
export function useGuestTurnNotifier({
  entryId,
  status,
  displayCode,
  businessName,
  readyTitle,
}: NotifyOnStatusChangeOptions) {
  const prevStatus = useRef<string | undefined>(undefined);
  const permissionAsked = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || permissionAsked.current) return;
    permissionAsked.current = true;
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const previous = prevStatus.current;
    prevStatus.current = status;
    if (!status || previous === status) return;
    // Skip first paint (e.g. refresh while already CALLED) — only live transitions.
    if (!previous) return;
    if (status !== 'CALLED') return;
    if (previous !== 'WAITING' && previous !== 'HOLDING' && previous !== 'SKIPPED') {
      return;
    }

    const title = readyTitle ?? "It's your turn!";
    const body = [displayCode ? `Number ${displayCode}` : null, businessName]
      .filter(Boolean)
      .join(' · ');

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 80, 200, 80, 400]);
      }
    } catch {
      // ignore
    }

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, {
          body: body || 'Please come to the counter',
          tag: `queueflow-turn-${entryId}`,
          renotify: true,
        });
        window.setTimeout(() => n.close(), 12_000);
      }
    } catch {
      // Browser may block notifications without a gesture.
    }

    // Always dispatch a DOM event so the track page can show a toast banner.
    window.dispatchEvent(
      new CustomEvent('queueflow:guest-turn', {
        detail: { entryId, displayCode, businessName, title, body },
      }),
    );
  }, [status, entryId, displayCode, businessName, readyTitle]);
}
