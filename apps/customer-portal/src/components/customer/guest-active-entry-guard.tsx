'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GuestTurnToast } from '@/components/customer/guest-turn-toast';
import { useEntryTracking } from '@/hooks/use-entry-tracking';
import { useGuestTurnNotifier } from '@/hooks/use-guest-turn-notifier';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { loadQueueSession } from '@/lib/storage/session';
import { isQueueUuid } from '@/lib/queue-id';

const ACTIONABLE = new Set(['CALLED', 'HOLDING', 'NO_SHOW', 'SKIPPED', 'COMPLETED', 'CANCELLED']);

/** Pull entry id from `/track/:entryId` return links used by Browse Menu. */
export function entryIdFromReturnPath(returnTo?: string | null): string | null {
  if (!returnTo) return null;
  const match = returnTo.match(/\/track\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  const id = match?.[1] ?? null;
  return id && isQueueUuid(id) ? id : null;
}

/**
 * Keeps guest queue realtime alive off the track page (e.g. Browse Menu).
 * When staff calls, surfaces toast/vibration and returns to the track screen
 * so the ready theme is unmistakable.
 */
export function GuestActiveEntryGuard({
  returnTo,
}: {
  returnTo?: string | null;
}) {
  const router = useRouter();
  const redirected = useRef(false);

  const entryId = useMemo(() => {
    const fromReturn = entryIdFromReturnPath(returnTo);
    if (fromReturn) return fromReturn;
    const session = loadQueueSession();
    return session?.entryId && isQueueUuid(session.entryId) ? session.entryId : '';
  }, [returnTo]);

  const { data } = useEntryTracking(entryId);
  const copy = getServiceModeCopy(data?.queue.serviceMode);

  useGuestTurnNotifier({
    entryId,
    status: data?.entry.status,
    calledAt: data?.entry.calledAt,
    displayCode: data?.entry.displayCode,
    businessName: data?.business.name,
    readyTitle: copy.readyTitle,
  });

  useEffect(() => {
    if (!data || !entryId || redirected.current) return;
    const status = data.entry.status;
    if (!ACTIONABLE.has(status)) return;
    // Stay on menu for calm WAITING updates; leave for anything staff-driven.
    if (status === 'WAITING') return;

    redirected.current = true;
    const dest =
      returnTo && returnTo.includes(entryId) ? returnTo : `/track/${entryId}`;
    // Give the toast a beat to paint, then land on the ready theme.
    const t = window.setTimeout(() => {
      router.replace(dest);
    }, 350);
    return () => window.clearTimeout(t);
  }, [data, entryId, returnTo, router]);

  if (!entryId) return null;

  const waiting = data?.entry.status === 'WAITING';
  const ahead = data?.customersAhead;

  return (
    <>
      <GuestTurnToast />
      {waiting ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <p className="rounded-full bg-q-green px-4 py-2 text-[12px] font-semibold text-q-lime shadow-lg">
            Still in line
            {typeof ahead === 'number' ? ` · ${ahead} ahead` : ''}
            {' · Live'}
          </p>
        </div>
      ) : null}
    </>
  );
}
