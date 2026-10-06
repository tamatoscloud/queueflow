'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Pencil, RefreshCw } from 'lucide-react';
import type { EntryTracking } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { customerApi } from '@/lib/api/customer-api';
import { loadQueueSession, saveQueueSession } from '@/lib/storage/session';
import { clampEstimatedWaitMinutes } from '@/lib/waiting/wait-estimate';
import { useWaitCountdown } from '@/hooks/use-wait-countdown';
import { WaitTimerCircle } from '@/components/customer/light/wait-timer-circle';
import {
  formatAhead,
  getServiceModeCopy,
} from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

type LightWaitingExperienceProps = {
  tracking: EntryTracking;
  connection: RealtimeConnectionState;
  className?: string;
};

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function maskPhone(phone?: string | null): string {
  if (!phone) return '+92 *** *** ****';
  const digits = phone.replace(/\D/g, '');
  const last3 = digits.slice(-3);
  if (digits.length >= 10) {
    return `+${digits.slice(0, 2)} *** *** *${last3}`;
  }
  return `*** *** *${last3 || '***'}`;
}

function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith('0') && trimmed.length >= 10) {
    return `+92${trimmed.slice(1)}`;
  }
  if (/^[0-9]{10,15}$/.test(trimmed)) return `+${trimmed}`;
  return trimmed;
}

function InfoTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl bg-[#f3f0ff] px-3.5 py-3', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b8b96]">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-bold uppercase leading-tight tracking-wide text-black">
        {value}
      </p>
    </div>
  );
}

export function LightWaitingExperience({
  tracking,
  connection,
  className,
}: LightWaitingExperienceProps) {
  const router = useRouter();
  const [browserNotify, setBrowserNotify] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState(() =>
    maskPhone(loadQueueSession()?.phone),
  );

  const session = loadQueueSession();
  const { customersAhead, estimatedWaitMinutes, position } = tracking;
  const copy = getServiceModeCopy(tracking.queue.serviceMode);
  // Whole minutes only — avoid false precision like "26.75".
  const clampedEstimate = Math.round(
    clampEstimatedWaitMinutes(estimatedWaitMinutes),
  );
  const countdown = useWaitCountdown(tracking.entry.id, clampedEstimate, true);

  const minsLeft = Math.max(0, Math.ceil(countdown.remainingSeconds / 60));
  const totalSeconds = Math.max(1, Math.round(clampedEstimate * 60));
  const progress = countdown.finished
    ? 0.08
    : Math.min(1, Math.max(0.08, countdown.remainingSeconds / totalSeconds));

  const guestName = (session?.fullName ?? 'Guest').trim() || 'Guest';
  const party = pad2(tracking.entry.partySize);
  const queueTotal = Math.max(position, customersAhead + 1);
  const branchLine = [tracking.branch.name].filter(Boolean).join(', ');
  const aheadText = formatAhead(customersAhead, copy);
  const waitWhy =
    customersAhead <= 0
      ? "You're next in line — please stay nearby."
      : `${aheadText} · about ${clampedEstimate} min estimated wait`;

  // Permission alone ≠ background push. Re-register when already granted; toggle ON only if subscribed.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      setBrowserNotify(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { enableGuestPushNotifications } = await import(
          '@/lib/notifications/web-push'
        );
        const result = await enableGuestPushNotifications(tracking.entry.id);
        if (!cancelled) setBrowserNotify(result.subscribed);
      } catch {
        if (!cancelled) setBrowserNotify(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tracking.entry.id]);

  const requestBrowserNotify = async () => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setNotifyError('Notifications need HTTPS.');
      return;
    }
    setNotifyBusy(true);
    setNotifyError(null);
    try {
      const { enableGuestPushNotifications, showGuestLocalNotification } =
        await import('@/lib/notifications/web-push');
      const result = await enableGuestPushNotifications(tracking.entry.id);
      setBrowserNotify(result.subscribed);
      if (result.subscribed) {
        await showGuestLocalNotification({
          title: "You're set",
          body: "We'll alert you when staff calls your number — even if this tab is in the background.",
          tag: `queueflow-ready-${tracking.entry.id}`,
          url: `/track/${tracking.entry.id}`,
        });
      } else if (result.error) {
        setNotifyError(result.error);
      }
    } finally {
      setNotifyBusy(false);
    }
  };

  const toggleNotify = () => {
    if (browserNotify) {
      setNotifyError(
        'To turn off alerts, use your browser site settings (permission can’t be revoked from this page).',
      );
      return;
    }
    void requestBrowserNotify();
  };

  const openEditPhone = () => {
    setPhoneError(null);
    setPhoneInput(session?.phone ?? '');
    setEditOpen(true);
  };

  const savePhone = async () => {
    const phone = normalizePhoneInput(phoneInput);
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      setPhoneError('Enter a valid phone with country code, e.g. +923001234567');
      return;
    }
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      const result = await customerApi.updateEntryContact(tracking.entry.id, {
        phone,
        trackingToken: session?.trackingToken,
      });
      const existing = loadQueueSession();
      if (existing?.entryId === tracking.entry.id) {
        saveQueueSession({ ...existing, phone: result.phone });
      }
      setPhoneMasked(result.phoneMasked);
      setEditOpen(false);
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : 'Could not update number');
    } finally {
      setPhoneBusy(false);
    }
  };

  const pollHint = useMemo(() => {
    if (connection === 'connected') return 'Auto-updating live';
    if (connection === 'reconnecting' || connection === 'connecting') {
      return 'Reconnecting…';
    }
    return 'Auto-updating every few seconds';
  }, [connection]);

  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      <section className="border-b border-[#ececf0] pb-6 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-black">
          You are in the Queue
          <span className="text-[#9b8cff]">!</span>
        </h1>
        <p className="mt-2 text-[13px] leading-snug text-[#6b7280]">
          We&apos;ll notify you when your turn approaches.
        </p>

        <div
          className="mx-auto mt-6 max-w-sm rounded-3xl bg-[#f3f0ff] px-5 py-6"
          aria-live="polite"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b8b96]">
            Waiting line
          </p>
          <p className="mt-2 font-display text-[56px] font-bold leading-none tracking-tight text-black tabular-nums">
            {customersAhead}
          </p>
          <p className="mt-2 text-[15px] font-semibold text-[#4b5563]">
            {aheadText}
            {customersAhead > 0 ? ' of you' : ''}
          </p>
          <p className="mt-3 text-[13px] leading-snug text-[#6b7280]">{waitWhy}</p>
        </div>

        <div className="relative mx-auto mt-6 w-[280px]">
          <WaitTimerCircle progress={progress} className="relative" />
        </div>

        <p
          className="mt-4 font-display text-[36px] font-bold leading-none tracking-tight text-black"
          aria-live="polite"
          aria-atomic="true"
        >
          {countdown.finished || customersAhead <= 0 ? (
            <span className="text-[24px]">Any moment</span>
          ) : (
            <>
              <span className="text-[15px] font-medium text-[#6b7280]">About </span>
              <span className="tabular-nums">{minsLeft}</span>
              <span className="ml-1.5 align-baseline text-[15px] font-medium text-[#6b7280]">
                min left
              </span>
            </>
          )}
        </p>
        <p className="mt-2 text-[12px] text-[#9ca3af]">
          Updates as people ahead of you are served
        </p>
      </section>

      <section className="border-b border-[#ececf0] py-6">
        <h2 className="font-display text-[26px] font-bold leading-tight text-black">
          {tracking.business.name}
        </h2>
        {branchLine ? (
          <p className="mt-1 text-[13px] text-[#6b7280]">{branchLine}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-[1.4fr_0.85fr] gap-2.5">
          <InfoTile label="Name" value={guestName} />
          <InfoTile label="Party Size" value={party} />
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          <InfoTile
            label="Ahead of you"
            value={String(customersAhead)}
          />
          <InfoTile label="In line" value={String(queueTotal)} />
          <div className="rounded-2xl bg-[#f3f0ff] px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b8b96]">
              {copy.tokenLabel}
            </p>
            <p
              className="mt-1 text-[17px] font-bold uppercase leading-tight tracking-wide text-black"
              aria-label={`Queue token ${tracking.entry.displayCode}`}
            >
              {tracking.entry.displayCode}
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-[12px] leading-snug text-[#6b7280]">
          You are #{position} of {queueTotal} in line. Show{' '}
          <span
            className="font-semibold text-black"
            aria-label={`Queue token ${tracking.entry.displayCode}`}
          >
            {tracking.entry.displayCode}
          </span>{' '}
          when staff calls you.
        </p>

        <button
          type="button"
          onClick={() => {
            const returnPath = `/track/${tracking.entry.id}`;
            const qs = new URLSearchParams({
              return: returnPath,
              name: tracking.business.name,
            });
            router.push(`/menu/${tracking.business.id}?${qs.toString()}`);
          }}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#9b8cff] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(155,140,255,0.35)] transition-opacity hover:opacity-95 active:scale-[0.98]"
        >
          Browse Menu
        </button>
      </section>

      <section className="space-y-3 py-6">
        <div className="rounded-2xl bg-[#f3f0ff] p-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9b8cff] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 19a2 2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-black">Browser Notifications</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                Alert you when staff calls. On iPhone: Add to Home Screen first. Live updates
                still work while this page is open.
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={browserNotify}
                aria-busy={notifyBusy}
                disabled={notifyBusy}
                onClick={toggleNotify}
                className={cn(
                  'relative mt-3 h-7 w-12 rounded-full transition-colors disabled:opacity-60',
                  browserNotify ? 'bg-[#9b8cff]' : 'bg-[#d4d0e8]',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                    browserNotify && 'translate-x-5',
                  )}
                />
              </button>
              {notifyError ? (
                <p className="mt-2 text-[11px] leading-snug text-[#b45309]">{notifyError}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#f3f0ff] p-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9b8cff] text-white">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-black">
                {tracking.notificationChannels?.whatsapp === true
                  ? 'WhatsApp Updates'
                  : tracking.notificationChannels?.sms === true
                    ? 'Text updates'
                    : 'Phone updates'}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                {tracking.notificationChannels?.whatsapp === true
                  ? `Receive a message at ${phoneMasked}.`
                  : tracking.notificationChannels?.sms === true
                    ? `Receive a text at ${phoneMasked}.`
                    : `We'll alert you on this page and via browser notifications. WhatsApp/SMS aren't connected yet.`}
              </p>
              <button
                type="button"
                onClick={openEditPhone}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#9b8cff]"
              >
                <Pencil className="h-3 w-3" aria-hidden />
                Edit Number
              </button>
            </div>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-[#9ca3af]">
          <RefreshCw className="h-3 w-3" aria-hidden />
          {pollHint}
        </p>
      </section>

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-phone-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 id="edit-phone-title" className="text-lg font-bold text-black">
              Update WhatsApp number
            </h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Use country code. Example: +923001234567
            </p>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              autoFocus
              className="mt-4 w-full rounded-xl border border-[#e5e7eb] px-3 py-3 text-base outline-none ring-[#9b8cff] focus:ring-2"
              placeholder="+923001234567"
            />
            {phoneError ? (
              <p className="mt-2 text-sm text-red-600">{phoneError}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={phoneBusy}
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-full border border-[#e5e7eb] py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={phoneBusy}
                onClick={() => void savePhone()}
                className="flex-1 rounded-full bg-[#9b8cff] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {phoneBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
