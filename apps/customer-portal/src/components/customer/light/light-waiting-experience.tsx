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
  const clampedEstimate = clampEstimatedWaitMinutes(estimatedWaitMinutes);
  const countdown = useWaitCountdown(tracking.entry.id, clampedEstimate, true);

  const mins = Math.floor(countdown.remainingSeconds / 60);
  const secs = countdown.remainingSeconds % 60;
  const totalSeconds = Math.max(1, Math.round(clampedEstimate * 60));
  const progress = countdown.finished
    ? 0.08
    : Math.min(1, Math.max(0.08, countdown.remainingSeconds / totalSeconds));

  const guestName = (session?.fullName ?? 'Guest').trim() || 'Guest';
  const party = pad2(tracking.entry.partySize);
  const queueTotal = Math.max(position, customersAhead + 1);
  const branchLine = [tracking.branch.name].filter(Boolean).join(', ');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setBrowserNotify(Notification.permission === 'granted');
  }, []);

  const requestBrowserNotify = async () => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setNotifyError('Notifications need HTTPS.');
      return;
    }
    setNotifyBusy(true);
    setNotifyError(null);
    try {
      const { enableGuestPushNotifications } = await import(
        '@/lib/notifications/web-push'
      );
      const result = await enableGuestPushNotifications(tracking.entry.id);
      const granted =
        result.ok &&
        'Notification' in window &&
        Notification.permission === 'granted';
      setBrowserNotify(granted);
      if (granted) {
        try {
          new Notification("You're set", {
            body: "We'll alert you when staff calls your number — even if this tab is in the background.",
            tag: `queueflow-ready-${tracking.entry.id}`,
          });
        } catch {
          // Some browsers require a gesture beyond permission — toggle still works.
        }
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

        <div className="relative mx-auto mt-6 w-[280px]">
          <WaitTimerCircle progress={progress} className="relative" />
        </div>

        <p
          className="mt-5 font-display text-[40px] font-bold leading-none tracking-tight text-black"
          aria-live="polite"
          aria-atomic="true"
        >
          {countdown.finished ? (
            <span className="text-[28px]">Any moment</span>
          ) : (
            <>
              <span className="tabular-nums">{mins}</span>
              <span className="ml-1.5 align-baseline text-[15px] font-medium text-[#6b7280]">
                mins
              </span>
              <span className="ml-2 tabular-nums">{pad2(secs)}</span>
              <span className="ml-1.5 align-baseline text-[15px] font-medium text-[#6b7280]">
                seconds
              </span>
            </>
          )}
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
          <InfoTile label="Queue" value={String(queueTotal)} />
          <InfoTile label="Position" value={`#${position}`} />
          <InfoTile label="Party Size" value={party} />
        </div>

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
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[var(--primary)] text-[15px] font-semibold text-[var(--on-primary)] shadow-[0_4px_14px_rgba(0,62,49,0.18)] transition-opacity hover:opacity-95 active:scale-[0.98]"
        >
          Browse Menu
        </button>
      </section>

      <section className="space-y-3 py-6">
        <div className="rounded-2xl bg-[#f3f0ff] p-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
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
                  browserNotify ? 'bg-[var(--primary)]' : 'bg-[#d4d0e8]',
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-black">WhatsApp Updates</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                Receive a message at {phoneMasked}.
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
                className="flex-1 rounded-full bg-[var(--primary)] py-3 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-60"
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
