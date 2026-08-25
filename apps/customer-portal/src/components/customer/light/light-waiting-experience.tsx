'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Pencil, RefreshCw } from 'lucide-react';
import type { EntryTracking } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { loadQueueSession } from '@/lib/storage/session';
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
    <div
      className={cn(
        'rounded-2xl bg-[#f3f0ff] px-3.5 py-3',
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b8b96]">{label}</p>
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
  const phoneMasked = maskPhone(session?.phone);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setBrowserNotify(Notification.permission === 'granted');
  }, []);

  const requestBrowserNotify = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserNotify(permission === 'granted');
  };

  const toggleNotify = () => {
    if (browserNotify) {
      // Browsers can't revoke permission from JS — guide the user.
      setBrowserNotify(false);
      return;
    }
    void requestBrowserNotify();
  };

  const pollHint = useMemo(() => {
    if (connection === 'connected') return 'Auto-updating live';
    if (connection === 'reconnecting' || connection === 'connecting') {
      return 'Reconnecting…';
    }
    return 'Auto-updating every 30 seconds';
  }, [connection]);

  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      {/* Hero */}
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
        <span className="sr-only">
          {countdown.finished
            ? 'Wait almost over'
            : `${countdown.remainingSeconds} seconds remaining`}
        </span>
      </section>

      {/* Venue + stats */}
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
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#9b8cff] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(155,140,255,0.35)] transition-opacity hover:opacity-95 active:scale-[0.98]"
        >
          Browse Menu
        </button>
      </section>

      {/* Notifications */}
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
                Get notified when you&apos;re almost up — even if this tab is in the background.
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={browserNotify}
                onClick={toggleNotify}
                className={cn(
                  'relative mt-3 h-7 w-12 rounded-full transition-colors',
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
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#f3f0ff] p-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9b8cff] text-white">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-black">WhatsApp Updates</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
                Receive a message at {phoneMasked}.
              </p>
              <button
                type="button"
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
    </div>
  );
}
