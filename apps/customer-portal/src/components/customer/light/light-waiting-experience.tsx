'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, MapPin, Phone } from 'lucide-react';
import type { EntryTracking } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { loadQueueSession } from '@/lib/storage/session';
import {
  formatAhead,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { formatConnectionLabel } from '@/lib/waiting/wait-helpers';
import { CalmCard, CalmLivePill, CalmSectionLabel } from '@/components/customer/calm/primitives';
import { cn } from '@/lib/utils';

type LightWaitingExperienceProps = {
  tracking: EntryTracking;
  connection: RealtimeConnectionState;
  className?: string;
};

function waitHeadline(
  customersAhead: number,
  copy: ReturnType<typeof getServiceModeCopy>,
): string {
  if (customersAhead <= 2) return copy.almostTitle;
  return copy.heroSubtitle;
}

function passContextLine(tracking: EntryTracking): string | null {
  const meta = tracking.entry.metadata;
  if (tracking.queue.serviceMode === 'TAKEAWAY' && meta?.orderNumber) {
    return `Order #${meta.orderNumber}`;
  }
  if (tracking.queue.serviceMode === 'DRIVE_IN') {
    const vehicle = [meta?.vehicleColor, meta?.vehicleMake].filter(Boolean).join(' ');
    if (vehicle) return vehicle;
    if (meta?.vehiclePlate) return meta.vehiclePlate;
  }
  return null;
}

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <CalmCard className="text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </CalmCard>
  );
}

export function LightWaitingExperience({
  tracking,
  connection,
  className,
}: LightWaitingExperienceProps) {
  const [browserNotify, setBrowserNotify] = useState(false);
  const session = loadQueueSession();
  const copy = useMemo(
    () => getServiceModeCopy(tracking.queue.serviceMode),
    [tracking.queue.serviceMode],
  );
  const { customersAhead, estimatedWaitMinutes, position } = tracking;
  const isAlmostUp = customersAhead <= 2;
  const headline = waitHeadline(customersAhead, copy);
  const connectionLabel = formatConnectionLabel(connection);
  const contextLine = passContextLine(tracking);
  const waitDisplay = estimatedWaitMinutes > 0 ? String(estimatedWaitMinutes) : '—';

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setBrowserNotify(Notification.permission === 'granted');
  }, []);

  const requestBrowserNotify = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserNotify(permission === 'granted');
  };

  return (
    <div className={cn('flex flex-1 flex-col gap-6 pb-4', className)}>
      <header className="text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-lg font-bold text-foreground">{tracking.business.name}</h2>
          <CalmLivePill label={connectionLabel} />
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground">{headline}</h1>
        {isAlmostUp ? (
          <p className="mt-2 text-sm text-muted">Please stay nearby.</p>
        ) : (
          <p className="mt-2 text-sm text-muted">{copy.joinNotifyMessage}</p>
        )}
      </header>

      <div
        className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-8 text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Your number</p>
        <p className="mt-2 font-display text-6xl font-bold tabular-nums tracking-tight text-primary sm:text-7xl">
          {tracking.entry.displayCode}
        </p>
        {contextLine ? <p className="mt-3 text-sm text-muted">{contextLine}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCell label="Position" value={String(position)} />
        <StatCell
          label="People ahead"
          value={String(customersAhead)}
          hint={formatAhead(customersAhead, copy)}
        />
      </div>

      <CalmCard className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Estimated wait
        </p>
        <p className="mt-2 font-display text-4xl font-bold tabular-nums text-foreground">
          {estimatedWaitMinutes > 0 ? `~${waitDisplay} min` : waitDisplay}
        </p>
        <p className="mt-3 text-sm font-medium text-foreground">
          Keep this page open. We&apos;ll let you know when it&apos;s your turn.
        </p>
        <span className="sr-only">{waitDisplay}</span>
      </CalmCard>

      <section aria-labelledby="while-you-wait-heading">
        <CalmSectionLabel>{copy.whileYouWaitTitle}</CalmSectionLabel>
        <div className="mt-3 grid gap-3">
          <CalmCard className="flex items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">{tracking.branch.name}</p>
              <p className="text-xs text-muted">Stay nearby — this screen updates live.</p>
            </div>
          </CalmCard>
        </div>
      </section>

      <section aria-labelledby="notifications-heading">
        <CalmSectionLabel>Stay in the loop</CalmSectionLabel>
        <div className="mt-3 space-y-3">
          <CalmCard className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Bell className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Browser notifications</p>
              <p className="mt-0.5 text-xs text-muted">Get notified when you&apos;re almost up.</p>
              {typeof window !== 'undefined' && 'Notification' in window ? (
                <button
                  type="button"
                  onClick={() => void requestBrowserNotify()}
                  className={cn(
                    'mt-2 rounded-full px-3 py-1 text-xs font-semibold',
                    browserNotify ? 'bg-primary text-white' : 'bg-primary/10 text-muted',
                  )}
                >
                  {browserNotify ? 'Enabled' : 'Enable'}
                </button>
              ) : (
                <p className="mt-2 text-xs text-muted">Notifications aren&apos;t available right now.</p>
              )}
            </div>
          </CalmCard>
        </div>
      </section>

      <CalmCard className="flex items-center gap-3">
        <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Need help?</p>
          <p className="text-xs text-muted">
            Show your number {tracking.entry.displayCode}
            {session?.phone ? '' : ''} at reception.
          </p>
        </div>
      </CalmCard>
    </div>
  );
}
