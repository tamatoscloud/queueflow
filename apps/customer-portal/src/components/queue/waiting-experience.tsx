'use client';

import Image from 'next/image';
import { isOptimizableImage } from '@/lib/images';
import { HelpCircle, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import type { EntryStatus } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { AnimatedCounter } from '@/components/queue/animated-counter';
import { ConfettiBurst } from '@/components/queue/confetti-burst';
import { LiveCountdown } from '@/components/queue/live-countdown';
import { ProgressRing } from '@/components/queue/progress-ring';
import { QueueTimeline, computeQueueProgress } from '@/components/queue/queue-timeline';
import { WalletPass } from '@/components/queue/wallet-pass';
import { Button } from '@/components/ui/button';
import { smartWaitMessage, MENU_TIPS, POPULAR_DISHES } from '@/lib/demo/restaurant-content';
import { cn, formatWait } from '@/lib/utils';

export type WaitingExperienceProps = {
  businessName: string;
  branchName: string;
  queueName: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  token: string;
  status: EntryStatus;
  position: number;
  customersAhead: number;
  estimatedWaitMinutes: number;
  snapshotGeneratedAt: string;
  queueId: string;
  isRestaurant?: boolean;
  connection: RealtimeConnectionState;
  dataUpdatedAt: number;
  onNeedHelp?: () => void;
  onCancel?: () => void;
};

export function WaitingExperience({
  businessName,
  branchName,
  queueName,
  logoUrl,
  heroImageUrl,
  token,
  status,
  position,
  customersAhead,
  estimatedWaitMinutes,
  snapshotGeneratedAt,
  isRestaurant = false,
  connection,
  dataUpdatedAt,
  onNeedHelp,
  onCancel,
}: WaitingExperienceProps) {
  const progress = computeQueueProgress(status, customersAhead, position);
  const isCalled = status === 'CALLED';
  const isAlmostReady = customersAhead <= 1 && !isCalled;
  const isLive = connection === 'connected';
  const isReconnecting = connection === 'connecting' || connection === 'reconnecting';

  const showConfetti = isCalled;

  return (
    <>
      <ConfettiBurst active={showConfetti} />

      {/* Hero restaurant image */}
      {heroImageUrl ? (
        <div className="relative -mx-4 -mt-2 h-44 overflow-hidden rounded-b-3xl sm:mx-0 sm:mt-0 sm:rounded-3xl">
          <Image
            src={heroImageUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 480px"
            unoptimized={!isOptimizableImage(heroImageUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={48}
                height={48}
                className="rounded-xl border-2 border-white/30 shadow-lg"
                unoptimized={!isOptimizableImage(logoUrl)}
              />
            ) : null}
            <div>
              <h1 className="text-xl font-bold text-foreground">{businessName}</h1>
              <p className="text-sm text-muted">{branchName} · {queueName}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Live status pill */}
      <div className="flex justify-center">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold',
            connection === 'connected'
              ? 'bg-success-light text-success animate-pulse-glow'
              : connection === 'offline' || connection === 'disconnected'
                ? 'glass text-muted'
                : 'bg-warning-light text-warning',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connection === 'connected' ? 'bg-success' : isReconnecting ? 'bg-warning' : 'bg-muted',
            )}
          />
          {isLive ? 'Live updates' : isReconnecting ? 'Reconnecting…' : connection === 'offline' ? 'Offline' : 'Updating…'}
        </div>
      </div>

      {/* Smart status message */}
      <div className="glass rounded-2xl px-5 py-4 text-center">
        <p className="text-base font-semibold text-foreground">
          {smartWaitMessage(status, customersAhead)}
        </p>
        {customersAhead > 0 && status === 'WAITING' ? (
          <div className="mt-3 flex justify-center gap-1" aria-hidden>
            {Array.from({ length: Math.min(customersAhead, 8) }).map((_, i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-primary/40"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Centerpiece ticket */}
      <WalletPass
        businessName={businessName}
        branchName={branchName}
        token={token}
        status={status}
        position={position}
        customersAhead={customersAhead}
        estimatedWaitMinutes={estimatedWaitMinutes}
        className="shadow-glow"
      />

      {/* Position hero */}
      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Your position
        </p>
        <AnimatedCounter
          value={position}
          prefix="#"
          className="text-6xl font-black tracking-tight text-primary"
        />
        <p className="text-center text-sm text-muted">
          <AnimatedCounter value={customersAhead} suffix="" />{' '}
          {customersAhead === 1 ? 'party' : 'parties'} ahead ·{' '}
          {formatWait(estimatedWaitMinutes)} estimated
        </p>
        {isRestaurant ? (
          <ProgressRing
            progress={progress}
            label={`#${position}`}
            sublabel={formatWait(estimatedWaitMinutes)}
          />
        ) : null}
      </div>

      {/* Celebration banners */}
      {isCalled ? (
        <div className="animate-success-pop rounded-2xl bg-gradient-to-r from-success to-secondary p-6 text-center shadow-lg">
          <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 text-white" aria-hidden />
          <p className="text-lg font-bold text-white">Your table is ready!</p>
          <p className="mt-1 text-sm text-white/90">Please proceed to the host stand</p>
        </div>
      ) : isAlmostReady ? (
        <div className="rounded-2xl border border-warning/30 bg-warning-light p-4 text-center">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-warning" aria-hidden />
          <p className="font-semibold text-foreground">Almost your turn!</p>
          <p className="text-sm text-muted">We&apos;re preparing everything for you</p>
        </div>
      ) : null}

      {/* Timeline */}
      <div className="glass rounded-2xl p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Your journey
        </p>
        <QueueTimeline status={status} customersAhead={customersAhead} />
      </div>

      {/* Countdown */}
      <div className="glass rounded-2xl p-5">
        <LiveCountdown
          estimatedWaitMinutes={estimatedWaitMinutes}
          snapshotGeneratedAt={snapshotGeneratedAt}
        />
      </div>

      {/* Tips & offers — restaurant mode */}
      {isRestaurant ? (
        <div className="glass space-y-3 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            While you wait
          </p>
          {MENU_TIPS.map((tip, i) => (
            <p key={i} className="text-sm text-muted">{tip}</p>
          ))}
          <div className="flex gap-2 overflow-x-auto pt-2">
            {POPULAR_DISHES.map((d) => (
              <div
                key={d.name}
                className="shrink-0 rounded-xl bg-gradient-to-r from-primary/10 to-accent-purple/10 px-3 py-2 text-xs font-semibold"
              >
                {d.name}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-2xl"
          onClick={onNeedHelp}
          type="button"
        >
          <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
          Need help?
        </Button>
        {onCancel ? (
          <Button
            variant="ghost"
            className="h-12 rounded-2xl text-danger"
            onClick={onCancel}
            type="button"
          >
            <X className="mr-2 h-4 w-4" aria-hidden />
            Leave queue
          </Button>
        ) : null}
      </div>

      {dataUpdatedAt > 0 ? (
        <p className="text-center text-xs text-muted">
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      ) : null}
    </>
  );
}
