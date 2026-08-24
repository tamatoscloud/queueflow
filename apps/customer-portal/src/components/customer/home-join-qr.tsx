'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQueueLanding } from '@/hooks/use-queue-landing';
import {
  DEMO_DINE_IN_QUEUE_ID,
  DEMO_QUEUE_NAME,
  DEMO_VENUE_NAME,
} from '@/lib/demo/bella-vista';

const DEFAULT_PORTAL_ORIGIN = 'https://queueflow-six-beta.vercel.app';

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
    <div className="flex w-full flex-col items-center gap-6">
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" aria-hidden />
          Real-time queue tracking
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">QueueFlow</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          Scan this QR with your phone camera to join the live waiting list.
        </p>
      </div>

      <Card className="w-full overflow-hidden">
        <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
          <div className="flex w-full items-center justify-between gap-2 text-left">
            <div>
              <p className="text-sm font-semibold text-foreground">{venue}</p>
              <p className="text-xs text-muted">{queueName}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isLive
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : isLoading
                    ? 'bg-neutral-100 text-muted'
                    : 'bg-amber-500/15 text-amber-800'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLive ? 'bg-emerald-500' : isLoading ? 'bg-neutral-400' : 'bg-amber-500'
                }`}
                aria-hidden
              />
              {isLoading ? 'Checking…' : isLive ? 'Live now' : 'Queue paused'}
            </span>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
            <QRCode
              value={joinUrl}
              size={200}
              level="M"
              aria-label={`QR code to join ${queueName}`}
            />
          </div>

          {typeof waiting === 'number' && isLive ? (
            <p className="text-sm text-muted">
              {waiting === 0
                ? 'No one waiting — you can be first.'
                : waiting === 1
                  ? '1 guest waiting ahead.'
                  : `${waiting} guests waiting ahead.`}
            </p>
          ) : null}

          <Button asChild variant="gradient" size="lg" className="w-full">
            <Link href={joinPath}>Join without scanning</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full text-left">
        <CardContent className="pt-5">
          <p className="font-semibold text-foreground">Already joined?</p>
          <p className="mt-1.5 text-sm text-muted">
            Open the tracking link from your confirmation screen, or check your SMS/WhatsApp
            notification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
