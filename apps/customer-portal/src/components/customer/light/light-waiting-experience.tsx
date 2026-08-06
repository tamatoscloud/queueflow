'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, MapPin, MessageCircle, Phone, UtensilsCrossed } from 'lucide-react';
import type { EntryTracking } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { isRestaurantDemo, MENU_TIPS } from '@/lib/demo/restaurant-content';
import { loadQueueSession } from '@/lib/storage/session';
import {
  formatAhead,
  formatWaitMinutes,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { computeWaitProgress, formatConnectionLabel } from '@/lib/waiting/wait-helpers';
import { CalmCard, CalmLivePill, CalmSectionLabel } from '@/components/customer/calm/primitives';
import { CalmDigitalPass } from '@/components/customer/calm/calm-digital-pass';
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

export function LightWaitingExperience({
  tracking,
  connection,
  className,
}: LightWaitingExperienceProps) {
  const [browserNotify, setBrowserNotify] = useState(false);
  const [baseline] = useState(() => tracking.customersAhead);
  const session = loadQueueSession();
  const copy = useMemo(
    () => getServiceModeCopy(tracking.queue.serviceMode),
    [tracking.queue.serviceMode],
  );
  const { customersAhead, estimatedWaitMinutes } = tracking;
  const isAlmostUp = customersAhead <= 2;
  const headline = waitHeadline(customersAhead, copy);
  const connectionLabel = formatConnectionLabel(connection);
  const progress = computeWaitProgress(baseline, customersAhead);
  const isDemo = isRestaurantDemo(tracking.business.name);
  const contextLine = passContextLine(tracking);

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
          <h2 className="font-display text-lg font-bold text-[#17151a]">{tracking.business.name}</h2>
          <CalmLivePill label={connectionLabel} />
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#17151a]">
          {headline.replace('!', '')}
          <span className="text-[#8b7cf8]">!</span>
        </h1>
        {isAlmostUp ? (
          <p className="mt-2 text-sm text-[#6b6870]">Please stay nearby.</p>
        ) : (
          <p className="mt-2 text-sm text-[#6b6870]">{copy.joinNotifyMessage}</p>
        )}
      </header>

      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className="booking-hourglass-ring flex h-44 w-44 items-center justify-center rounded-full p-2"
          style={
            {
              background: `conic-gradient(from -90deg, #8b7cf8 0%, #8b7cf8 ${progress}%, #ede9fe ${progress}%, #ede9fe 100%)`,
            } as React.CSSProperties
          }
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#faf8f5]">
            <span className="font-display text-5xl font-bold tabular-nums text-[#17151a]">
              {estimatedWaitMinutes > 0 ? estimatedWaitMinutes : '—'}
            </span>
            <span className="text-sm font-medium text-[#6b6870]">min</span>
          </div>
        </div>
        <p className="text-center text-xl font-bold text-[#17151a]">
          {formatAhead(customersAhead, copy)}
        </p>
        <p className="text-sm text-[#6b6870]">{formatWaitMinutes(estimatedWaitMinutes, copy)}</p>
      </div>

      <CalmDigitalPass
        restaurantName={tracking.business.name}
        displayCode={tracking.entry.displayCode}
        partySize={tracking.entry.partySize}
        customersAhead={customersAhead}
        estimatedWaitMinutes={estimatedWaitMinutes}
        connection={connection}
        copy={copy}
        serviceMode={tracking.queue.serviceMode ?? 'DINE_IN'}
        contextLine={contextLine}
      />

      <section aria-labelledby="while-you-wait-heading">
        <CalmSectionLabel>{copy.whileYouWaitTitle}</CalmSectionLabel>
        <div className="mt-3 grid gap-3">
          {isDemo ? (
            <CalmCard className="flex items-center gap-3">
              <UtensilsCrossed className="h-5 w-5 shrink-0 text-[#8b7cf8]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-[#17151a]">Browse menu</p>
                <p className="text-xs text-[#6b6870]">{MENU_TIPS[0]}</p>
              </div>
            </CalmCard>
          ) : null}
          <CalmCard className="flex items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-[#8b7cf8]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-[#17151a]">{tracking.branch.name}</p>
              <p className="text-xs text-[#6b6870]">Relax nearby — we&apos;ll keep you updated</p>
            </div>
          </CalmCard>
        </div>
      </section>

      <section aria-labelledby="notifications-heading">
        <CalmSectionLabel>Stay in the loop</CalmSectionLabel>
        <div className="mt-3 space-y-3">
          <CalmCard className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8b7cf8] text-white">
              <Bell className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#17151a]">Browser notifications</p>
              <p className="mt-0.5 text-xs text-[#6b6870]">
                Get notified when you&apos;re almost up.
              </p>
              {typeof window !== 'undefined' && 'Notification' in window ? (
                <button
                  type="button"
                  onClick={() => void requestBrowserNotify()}
                  className={cn(
                    'mt-2 rounded-full px-3 py-1 text-xs font-semibold',
                    browserNotify
                      ? 'bg-[#8b7cf8] text-white'
                      : 'bg-[#eae5f8] text-[#6b6870]',
                  )}
                >
                  {browserNotify ? 'Enabled' : 'Enable'}
                </button>
              ) : (
                <p className="mt-2 text-xs text-[#6b6870]">
                  Notifications aren&apos;t available right now.
                </p>
              )}
            </div>
          </CalmCard>

          <CalmCard className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8b7cf8] text-white">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#17151a]">WhatsApp updates</p>
              <p className="mt-0.5 text-xs text-[#6b6870]">
                {session?.phone ? maskPhone(session.phone) : copy.notificationHint}
              </p>
            </div>
          </CalmCard>
        </div>
      </section>

      <CalmCard className="flex items-center gap-3">
        <Phone className="h-5 w-5 shrink-0 text-[#8b7cf8]" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-[#17151a]">Need help?</p>
          <p className="text-xs text-[#6b6870]">
            Show your number {tracking.entry.displayCode} at reception.
          </p>
        </div>
      </CalmCard>
    </div>
  );
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}
