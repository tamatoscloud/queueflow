'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Download, Share2, Smartphone } from 'lucide-react';
import { ConfettiBurst } from '@/components/queue/confetti-burst';
import { WalletPass } from '@/components/queue/wallet-pass';
import { GlassCard } from '@/components/customer/primitives';
import { TrackQrSummary } from '@/components/queue/track-qr-summary';
import { ProgressRing } from '@/components/queue/progress-ring';
import { Button } from '@/components/ui/button';
import { MENU_TIPS, POPULAR_DISHES } from '@/lib/demo/restaurant-content';
import { formatWait } from '@/lib/utils';
import Image from 'next/image';

type SuccessCelebrationProps = {
  queueId: string;
  entryId: string;
  displayCode: string;
  position: number;
  ahead: number;
  wait: number;
  businessName: string;
  branchName: string;
  isRestaurant?: boolean;
};

export function SuccessCelebration({
  queueId,
  entryId,
  displayCode,
  position,
  ahead,
  wait,
  businessName,
  branchName,
  isRestaurant = false,
}: SuccessCelebrationProps) {
  const [copied, setCopied] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const trackUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/track/${entryId}`;
    return `${window.location.origin}/track/${entryId}`;
  }, [entryId]);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'My waitlist pass',
      text: `Token ${displayCode} — track my wait`,
      url: trackUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(trackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayCode, trackUrl]);

  const progress = Math.max(0.1, 1 - ahead / Math.max(position, 1));

  return (
    <div className="flex flex-1 flex-col gap-5 animate-fade-in-up">
      <ConfettiBurst active={showCheck} />

      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success to-secondary shadow-glow transition-all duration-500 ${
            showCheck ? 'scale-100' : 'scale-75 opacity-0'
          }`}
        >
          <Check className="h-12 w-12 text-white animate-success-pop" aria-hidden />
        </div>
        <h1 className="text-2xl font-black text-foreground">You&apos;re on the list!</h1>
        <p className="mt-2 text-muted">Your digital pass is ready. We&apos;ll notify you when it&apos;s time.</p>
      </div>

      <WalletPass
        businessName={businessName}
        branchName={branchName}
        token={displayCode}
        status="WAITING"
        position={position}
        customersAhead={ahead}
        estimatedWaitMinutes={wait}
        className="shadow-glow"
      />

      <div className="flex justify-center">
        <ProgressRing progress={progress} label={`#${position}`} sublabel={formatWait(wait)} />
      </div>

      <TrackQrSummary trackUrl={trackUrl} displayCode={displayCode} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 rounded-2xl" onClick={() => void handleShare()}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </Button>
        <Button
          variant="outline"
          className="h-12 rounded-2xl"
          onClick={() => void navigator.clipboard.writeText(trackUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>

      <GlassCard className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Add to Home Screen</p>
          <p className="text-xs text-muted">Tap Share → Add to Home Screen for quick access to your pass.</p>
        </div>
      </GlassCard>

      {isRestaurant ? (
        <>
          <GlassCard>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">While you wait</p>
            <p className="text-sm text-muted">{MENU_TIPS[0]}</p>
          </GlassCard>
          <div className="flex gap-2 overflow-x-auto">
            {POPULAR_DISHES.slice(0, 2).map((d) => (
              <div key={d.name} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl">
                <Image src={d.image} alt={d.name} fill className="object-cover" sizes="112px" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      <GlassCard className="flex items-start gap-3 border-dashed">
        <Download className="h-5 w-5 text-primary" aria-hidden />
        <p className="text-xs text-muted">Screenshot your pass or bookmark the tracking link.</p>
      </GlassCard>

      <Button variant="default" size="lg" className="h-14 w-full rounded-2xl" asChild>
        <Link href={`/track/${entryId}`}>
          Track your position
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </Button>

      <Link
        href={`/q/${queueId}`}
        className="text-center text-sm text-muted underline-offset-2 hover:underline"
      >
        Back to restaurant
      </Link>
    </div>
  );
}
