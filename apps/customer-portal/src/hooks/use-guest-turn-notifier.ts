'use client';

import { useEffect, useRef } from 'react';

export type GuestAlertKind =
  | 'called'
  | 'recalled'
  | 'holding'
  | 'no_show'
  | 'skipped'
  | 'completed'
  | 'cancelled';

type NotifyOnStatusChangeOptions = {
  entryId: string;
  status: string | undefined;
  /** Bumps on recall so we can re-alert while status stays CALLED. */
  calledAt?: string | null;
  displayCode?: string;
  businessName?: string;
  readyTitle?: string;
};

type AlertCopy = { title: string; body: string; kind: GuestAlertKind };

function alertForTransition(
  previous: string,
  next: string,
  opts: {
    displayCode?: string;
    businessName?: string;
    readyTitle?: string;
    recalled?: boolean;
  },
): AlertCopy | null {
  const context = [opts.displayCode ? `Number ${opts.displayCode}` : null, opts.businessName]
    .filter(Boolean)
    .join(' · ');

  if (opts.recalled && next === 'CALLED') {
    return {
      kind: 'recalled',
      title: 'Please come now',
      body: context || 'Staff is calling you again',
    };
  }

  if (next === 'CALLED') {
    if (previous !== 'WAITING' && previous !== 'HOLDING' && previous !== 'SKIPPED') {
      return null;
    }
    return {
      kind: 'called',
      title: opts.readyTitle ?? "It's your turn!",
      body: context || 'Please come to the counter',
    };
  }

  if (next === 'HOLDING' && previous !== 'HOLDING') {
    return {
      kind: 'holding',
      title: "You're on hold",
      body: context || "We'll call you again shortly",
    };
  }

  if (next === 'NO_SHOW' && previous !== 'NO_SHOW') {
    return {
      kind: 'no_show',
      title: 'Marked as no-show',
      body: context || 'Please check in with staff if you are still here',
    };
  }

  if (next === 'SKIPPED' && previous !== 'SKIPPED') {
    return {
      kind: 'skipped',
      title: 'You were skipped',
      body: context || 'Please speak with staff for help',
    };
  }

  if (next === 'COMPLETED' && previous !== 'COMPLETED') {
    return {
      kind: 'completed',
      title: "You're seated",
      body: context || 'Enjoy your visit',
    };
  }

  if (next === 'CANCELLED' && previous !== 'CANCELLED') {
    return {
      kind: 'cancelled',
      title: 'Entry cancelled',
      body: context || 'This queue entry is no longer active',
    };
  }

  return null;
}

function fireGuestAlert(
  entryId: string,
  alert: AlertCopy,
  recentRef?: { current: { key: string; at: number } | null },
) {
  const key = `${alert.kind}:${entryId}:${alert.title}`;
  const now = Date.now();
  if (recentRef) {
    const recent = recentRef.current;
    if (recent && recent.key === key && now - recent.at < 3500) {
      return;
    }
    recentRef.current = { key, at: now };
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(
        alert.kind === 'called' || alert.kind === 'recalled'
          ? [200, 80, 200, 80, 400]
          : [160, 60, 160],
      );
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(alert.title, {
        body: alert.body,
        tag: `queueflow-${alert.kind}-${entryId}`,
      });
      window.setTimeout(() => n.close(), 12_000);
    }
  } catch {
    // Browser may block notifications without a gesture.
  }

  window.dispatchEvent(
    new CustomEvent('queueflow:guest-turn', {
      detail: {
        entryId,
        title: alert.title,
        body: alert.body,
        kind: alert.kind,
      },
    }),
  );
}

/**
 * Surface in-app + browser alerts for staff actions even when SMS/WhatsApp
 * credentials are missing. Covers call, recall, hold, no-show, skip, seat.
 */
export function useGuestTurnNotifier({
  entryId,
  status,
  calledAt,
  displayCode,
  businessName,
  readyTitle,
}: NotifyOnStatusChangeOptions) {
  const prevStatus = useRef<string | undefined>(undefined);
  const prevCalledAt = useRef<string | null | undefined>(undefined);
  const permissionAsked = useRef(false);
  const recentAlert = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || permissionAsked.current) return;
    permissionAsked.current = true;
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // Immediate toast from socket envelope (before HTTP refetch finishes).
  useEffect(() => {
    const onRealtime = (event: Event) => {
      const custom = event as CustomEvent<{
        entryId?: string;
        eventName?: string;
        displayCode?: string;
        businessName?: string;
      }>;
      if (custom.detail?.entryId && custom.detail.entryId !== entryId) return;
      const name = custom.detail?.eventName;
      if (!name) return;

      const code = custom.detail.displayCode ?? displayCode;
      const biz = custom.detail.businessName ?? businessName;
      const context = [code ? `Number ${code}` : null, biz].filter(Boolean).join(' · ');

      if (name === 'CustomerCalled') {
        fireGuestAlert(
          entryId,
          {
            kind: status === 'CALLED' ? 'recalled' : 'called',
            title: status === 'CALLED' ? 'Please come now' : (readyTitle ?? "It's your turn!"),
            body: context || 'Please come to the counter',
          },
          recentAlert,
        );
        return;
      }
      if (name === 'CustomerHeld') {
        fireGuestAlert(
          entryId,
          {
            kind: 'holding',
            title: "You're on hold",
            body: context || "We'll call you again shortly",
          },
          recentAlert,
        );
        return;
      }
      if (name === 'CustomerSkipped') {
        fireGuestAlert(
          entryId,
          {
            kind: 'skipped',
            title: 'You were skipped',
            body: context || 'Please speak with staff for help',
          },
          recentAlert,
        );
        return;
      }
      if (name === 'CustomerCompleted') {
        fireGuestAlert(
          entryId,
          {
            kind: 'completed',
            title: "You're seated",
            body: context || 'Enjoy your visit',
          },
          recentAlert,
        );
      }
    };

    window.addEventListener('queueflow:realtime-entry', onRealtime);
    return () => window.removeEventListener('queueflow:realtime-entry', onRealtime);
  }, [entryId, status, displayCode, businessName, readyTitle]);

  useEffect(() => {
    const previous = prevStatus.current;
    const previousCalledAt = prevCalledAt.current;
    prevStatus.current = status;
    prevCalledAt.current = calledAt;

    if (!status) return;
    // Skip first paint — only live transitions.
    if (!previous) return;

    const recalled =
      status === 'CALLED' &&
      previous === 'CALLED' &&
      Boolean(calledAt) &&
      calledAt !== previousCalledAt;

    if (previous === status && !recalled) return;

    const alert = alertForTransition(previous, status, {
      displayCode,
      businessName,
      readyTitle,
      recalled,
    });
    if (!alert) return;
    fireGuestAlert(entryId, alert, recentAlert);
  }, [status, calledAt, entryId, displayCode, businessName, readyTitle]);
}
