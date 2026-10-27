'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ConciergeBell, Phone } from 'lucide-react';
import { QuykIconBubble, QuykPill } from '@/components/quyk/ui';
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
  ariaLabel,
  className,
}: {
  label: string;
  value: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[16px] border border-q-line bg-white px-3.5 py-3', className)}>
      <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.04em] text-q-subtle">{label}</p>
      <p
        className="mt-1 truncate text-[17px] font-bold uppercase leading-tight text-q-green"
        aria-label={ariaLabel}
      >
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
  const aheadText = formatAhead(customersAhead, copy);

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

  const aheadPadded = pad2(customersAhead);
  const aheadCaption =
    customersAhead <= 0
      ? "You're next in line"
      : `${aheadText}${customersAhead > 0 ? ' of you' : ''}`;
  const etaLine =
    customersAhead <= 0
      ? 'Please stay nearby.'
      : `About ${clampedEstimate} ${clampedEstimate === 1 ? 'min' : 'mins'} estimated wait.`;

  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
      <div>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-q-green">
          You&apos;re in the queue
        </h1>
        <p className="mt-1.5 text-[14px] leading-snug text-q-muted">
          Keep this page open — we&apos;ll flip it when it&apos;s your turn.
        </p>
      </div>

      <section
        className="rounded-[26px] bg-q-green px-5 pb-6 pt-4 text-center text-white"
        aria-live="polite"
      >
        <div className="flex justify-end">
          <QuykPill tone="lime">Waiting Line</QuykPill>
        </div>
        <p className="mt-1 text-[44px] font-bold leading-none tracking-[-0.02em] text-q-lime tabular-nums">
          {aheadPadded}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-q-lime">
          {aheadCaption}
        </p>
        <p className="mt-1 text-[14px] text-white/80">{etaLine}</p>

        <WaitTimerCircle progress={progress} className="mx-auto mt-5" />

        <p className="mt-5 text-[22px] font-semibold text-white" aria-live="polite" aria-atomic="true">
          {countdown.finished || customersAhead <= 0
            ? 'Any moment now'
            : `${minsLeft} ${minsLeft === 1 ? 'min' : 'mins'} left`}
        </p>
        <p className="mt-1 text-[13px] text-white/75">Updates as people ahead of you are served.</p>
      </section>

      <div className="grid grid-cols-[1.35fr_1fr] gap-2.5">
        <InfoTile label="Name" value={guestName} />
        <InfoTile label="Party size" value={party} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <InfoTile label="Ahead of you" value={String(customersAhead)} />
        <InfoTile label="In line" value={String(queueTotal)} />
        <InfoTile
          label={copy.tokenLabel}
          value={tracking.entry.displayCode}
          ariaLabel={`Queue token ${tracking.entry.displayCode}`}
        />
      </div>
      <p className="text-center text-[12px] leading-snug text-q-muted">
        You&apos;re #{position} of {queueTotal} in line. Show{' '}
        <span className="font-bold text-q-ink">{tracking.entry.displayCode}</span> when the host
        calls you.
      </p>

      <button
        type="button"
        onClick={() => {
          const returnPath = `/track/${tracking.entry.id}`;
          const qs = new URLSearchParams({ return: returnPath, name: tracking.business.name });
          router.push(`/menu/${tracking.business.id}?${qs.toString()}`);
        }}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-q-lime text-[16px] font-semibold text-q-green transition-opacity hover:opacity-95"
      >
        <ConciergeBell className="h-5 w-5" aria-hidden />
        Browse menu
      </button>

      <div className="flex gap-3 rounded-[20px] border border-q-line bg-white px-4 py-4">
        <QuykIconBubble icon={Bell} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold text-q-ink">Browser notifications</p>
            <button
              type="button"
              role="switch"
              aria-checked={browserNotify}
              aria-busy={notifyBusy}
              aria-label="Browser notifications"
              disabled={notifyBusy}
              onClick={toggleNotify}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
                browserNotify ? 'bg-q-green' : 'bg-[#e3eadb]',
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-6 w-6 rounded-full shadow transition-transform',
                  browserNotify ? 'translate-x-5 bg-q-lime' : 'bg-white',
                )}
              />
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-q-muted">
            Get an alert when staff call you. On iPhone, add this page to your Home Screen first.
          </p>
          {notifyError ? (
            <p className="mt-2 text-[12px] leading-snug text-[#7a4b0c]">{notifyError}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[20px] bg-q-lime-tint px-4 py-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-q-ink">
          <Phone className="h-4 w-4 text-q-green" aria-hidden />
          {tracking.notificationChannels?.whatsapp === true
            ? 'WhatsApp updates'
            : tracking.notificationChannels?.sms === true
              ? 'Text updates'
              : 'Phone updates'}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-q-muted">
          {tracking.notificationChannels?.whatsapp === true
            ? `We'll message you at ${phoneMasked}.`
            : tracking.notificationChannels?.sms === true
              ? `We'll text you at ${phoneMasked}.`
              : "We'll update you on this page and with browser notifications. WhatsApp and SMS aren't connected yet."}
        </p>
        <button
          type="button"
          onClick={openEditPhone}
          className="mt-2 text-[13px] font-semibold text-q-green underline underline-offset-2"
        >
          Edit number
        </button>
      </div>

      <p className="flex items-center justify-center gap-2 text-[12px] text-q-subtle">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            connection === 'connected' ? 'bg-q-green' : 'bg-q-subtle',
          )}
          aria-hidden
        />
        {pollHint}
      </p>

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-q-green/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-phone-title"
        >
          <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-xl">
            <h3 id="edit-phone-title" className="text-[18px] font-semibold text-q-green">
              Update your number
            </h3>
            <p className="mt-1 text-[14px] text-q-muted">Use country code. Example: +923001234567</p>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              autoFocus
              className="mt-4 h-[52px] w-full rounded-[14px] border border-q-field px-4 text-[16px] outline-none focus:border-q-green focus:shadow-[0_0_0_3px_var(--q-lime)]"
              placeholder="+923001234567"
            />
            {phoneError ? <p className="mt-2 text-[13px] text-[#9a3412]">{phoneError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={phoneBusy}
                onClick={() => setEditOpen(false)}
                className="h-12 flex-1 rounded-full border-[1.5px] border-q-green text-[15px] font-semibold text-q-green"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={phoneBusy}
                onClick={() => void savePhone()}
                className="h-12 flex-1 rounded-full bg-q-green text-[15px] font-semibold text-q-lime disabled:opacity-60"
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
