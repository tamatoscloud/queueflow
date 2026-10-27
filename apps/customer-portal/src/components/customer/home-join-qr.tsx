'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useQueueLanding } from '@/hooks/use-queue-landing';
import {
  DEMO_DINE_IN_QUEUE_ID,
  DEMO_QUEUE_NAME,
  DEMO_VENUE_NAME,
} from '@/lib/demo/bella-vista';
import { QuykLinkButton, QuykPill, QuykWordmark } from '@/components/quyk/ui';
import { cn } from '@/lib/utils';

const DEFAULT_PORTAL_ORIGIN = 'https://queueflow-six-beta.vercel.app';

function waitingLine(waiting: number): string {
  if (waiting === 0) return 'No one waiting — you can be first.';
  if (waiting === 1) return '1 party waiting ahead.';
  return `${waiting} parties waiting ahead.`;
}

/** Figma screen 1: venue QR poster on deep green. */
export function HomeJoinQr() {
  const joinPath = `/q/${DEMO_DINE_IN_QUEUE_ID}`;
  const { data, isLoading } = useQueueLanding(DEMO_DINE_IN_QUEUE_ID);
  const isLive =
    data?.live.isOpen === true &&
    data?.queue.status === 'ACTIVE' &&
    data?.queue.isAcceptingEntries === true;
  const venue = data?.branch.name ?? DEMO_VENUE_NAME;
  const queueName = data?.queue.name ?? DEMO_QUEUE_NAME;
  const waiting = data?.live.waitingCount;

  // Absolute URL required — phone cameras cannot open relative paths.
  const [joinUrl, setJoinUrl] = useState(
    `${process.env.NEXT_PUBLIC_PORTAL_ORIGIN ?? DEFAULT_PORTAL_ORIGIN}${joinPath}`,
  );
  useEffect(() => {
    setJoinUrl(`${window.location.origin}${joinPath}`);
  }, [joinPath]);

  return (
    <div className="flex w-full flex-col items-center gap-5 text-center">
      <QuykWordmark className="h-8 w-auto" />

      <QuykPill tone="panel" className="px-3 py-1.5 text-[11px]">
        Live queue · no app needed
      </QuykPill>

      <div>
        <h1 className="text-[30px] font-medium leading-tight tracking-[-0.02em] text-white">
          Your queue, made <span className="font-bold text-q-lime">Quyk.</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[15px] leading-snug text-white/85">
          Scan this code with your phone camera to join the waiting list. No app, no account.
        </p>
      </div>

      <div className="w-full rounded-[26px] bg-white px-5 pb-5 pt-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold text-q-green">{venue}</p>
            <p className="mt-0.5 text-[13px] text-q-subtle">{queueName}</p>
          </div>
          <QuykPill
            tone={isLive ? 'lime' : 'tint'}
            className={cn(!isLive && !isLoading && 'bg-warning-light text-[#7a4b0c]')}
          >
            {isLoading ? 'Checking…' : isLive ? 'Live now' : 'Queue paused'}
          </QuykPill>
        </div>

        <div className="mx-auto mt-4 w-fit rounded-[22px] bg-q-cream p-4">
          <QRCode
            value={joinUrl}
            size={176}
            level="M"
            fgColor="#003d32"
            bgColor="#f3f7ea"
            aria-label={`QR code to join ${queueName}`}
          />
        </div>

        {typeof waiting === 'number' && isLive ? (
          <p className="mt-4 text-center text-[14px] text-q-muted">{waitingLine(waiting)}</p>
        ) : null}

        <QuykLinkButton href={joinPath} className="mt-4">
          Join without scanning
        </QuykLinkButton>
      </div>

      <div className="w-full rounded-[22px] bg-q-green-panel px-5 py-4 text-left">
        <p className="text-[15px] font-semibold text-white">Already joined?</p>
        <p className="mt-1 text-[13px] leading-snug text-white/80">
          Open the tracking link on your confirmation screen, or reopen this page — your place is
          saved.
        </p>
      </div>
    </div>
  );
}
