'use client';

import Image from 'next/image';
import { isOptimizableImage } from '@/lib/images';
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, Sparkles, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { QueueLanding } from '@/lib/api/types';
import { GlassCard, FloatingParticles } from '@/components/customer/primitives';
import { PremiumEmpty, RatingStars } from '@/components/customer/premium-states';
import { BusyMeter } from '@/components/customer/busy-meter';
import { StatusBadge } from '@/components/queue/status-badge';
import { Button } from '@/components/ui/button';
import { loadQueueSession } from '@/lib/storage/session';
import {
  GOOGLE_REVIEW_SNIPPET,
  OPENING_HOURS,
  POPULAR_DISHES,
  RESTAURANT_ADDRESS,
  RESTAURANT_AMBIENCE_IMAGES,
  RESTAURANT_HERO_IMAGE_URL,
  RESTAURANT_PHONE,
  RESTAURANT_RATING,
  RESTAURANT_REVIEW_COUNT,
  RESTAURANT_TAGLINE,
  TODAY_SPECIALS,
  isRestaurantDemo,
} from '@/lib/demo/restaurant-content';
import { formatWait } from '@/lib/utils';

export function RestaurantLanding({ data, queueId }: { data: QueueLanding; queueId: string }) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSession, setActiveSession] = useState<ReturnType<typeof loadQueueSession>>(null);
  const isRestaurant = isRestaurantDemo(data.business.name);
  const canJoin = data.live.isOpen && data.queue.isAcceptingEntries;
  const heroUrl = isRestaurant ? RESTAURANT_HERO_IMAGE_URL : null;

  useEffect(() => {
    const session = loadQueueSession();
    if (session?.queueId === queueId) {
      setActiveSession(session);
    }
  }, [queueId]);

  if (!canJoin && !data.live.isOpen) {
    return (
      <PremiumEmpty
        variant="closed"
        action={
          isRestaurant
            ? { label: 'Call restaurant', href: `tel:${RESTAURANT_PHONE}` }
            : undefined
        }
      />
    );
  }

  return (
    <div className="relative flex flex-1 flex-col gap-5 pb-4 animate-fade-in-up">
      <FloatingParticles />

      {/* Hero */}
      <div className="relative -mx-4 h-56 overflow-hidden rounded-b-[2rem] sm:mx-0 sm:rounded-3xl">
        {heroUrl ? (
          <Image src={heroUrl} alt="" fill className="object-cover" priority sizes="100vw" unoptimized={!isOptimizableImage(heroUrl)} />
        ) : (
          <div className="h-full bg-gradient-to-br from-primary to-accent-purple" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-black text-foreground">{data.business.name}</h1>
          <p className="text-sm text-muted">{data.branch.name}</p>
          {isRestaurant ? (
            <div className="mt-2">
              <RatingStars rating={RESTAURANT_RATING} count={RESTAURANT_REVIEW_COUNT} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <StatusBadge queueStatus={data.queue.status} isOpen={data.live.isOpen} />
        {isRestaurant ? <BusyMeter waitingCount={data.live.waitingCount} /> : null}
      </div>

      {/* Wait stats — above fold */}
      <GlassCard className="!p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-3xl font-black text-primary">{data.live.waitingCount}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Waiting</p>
          </div>
          <div>
            <p className="text-3xl font-black text-secondary">
              {formatWait(data.live.estimatedWaitMinutes)}
            </p>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Est. wait</p>
          </div>
        </div>
      </GlassCard>

      {/* Resume or join */}
      {activeSession ? (
        <Button
          variant="gradient"
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-bold shadow-glow active:scale-[0.98]"
          onClick={() => router.push(`/track/${activeSession.entryId}`)}
        >
          <Radio className="mr-2 h-5 w-5" aria-hidden />
          Continue tracking · {activeSession.displayCode}
        </Button>
      ) : null}

      <Button
        variant={activeSession ? 'outline' : 'gradient'}
        size="lg"
        className="h-14 w-full rounded-2xl text-base font-bold shadow-glow active:scale-[0.98]"
        disabled={!canJoin}
        onClick={() => router.push(`/q/${queueId}/join`)}
      >
        {activeSession ? 'Join again' : isRestaurant ? 'Join Waitlist' : 'Join Queue'}
      </Button>

      {!canJoin ? (
        <p className="text-center text-sm text-muted">
          Not accepting guests right now — check back soon.
        </p>
      ) : null}

      {/* How it works */}
      <GlassCard>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">How it works</p>
        <ol className="space-y-3 text-sm">
          {['Scan & join', 'Live tracking on one screen', 'We text when ready'].map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </GlassCard>

      {isRestaurant ? (
        <>
          {/* Specials */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-warning" aria-hidden />
              Today&apos;s specials
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {TODAY_SPECIALS.map((s) => (
                <GlassCard key={s.title} className="min-w-[140px] shrink-0 snap-start !p-3">
                  <p className="text-xs font-semibold text-primary">{s.tag}</p>
                  <p className="font-bold">{s.title}</p>
                  <p className="text-sm text-muted">{s.price}</p>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Menu carousel */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">Popular dishes</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Scroll left"
                  className="rounded-full p-1 hover:bg-primary/10"
                  onClick={() => carouselRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll right"
                  className="rounded-full p-1 hover:bg-primary/10"
                  onClick={() => carouselRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {POPULAR_DISHES.map((d) => (
                <div key={d.name} className="relative h-28 w-36 shrink-0 snap-start overflow-hidden rounded-2xl">
                  <Image src={d.image} alt={d.name} fill className="object-cover" sizes="144px" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs font-semibold text-white">{d.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review snippet */}
          <GlassCard>
            <RatingStars rating={GOOGLE_REVIEW_SNIPPET.stars} count={1} />
            <p className="mt-2 text-sm italic text-muted">&ldquo;{GOOGLE_REVIEW_SNIPPET.text}&rdquo;</p>
            <p className="mt-1 text-xs font-semibold">— {GOOGLE_REVIEW_SNIPPET.author}</p>
          </GlassCard>

          {/* Ambience */}
          <div className="flex gap-2 overflow-x-auto">
            {RESTAURANT_AMBIENCE_IMAGES.map((src, i) => (
              <div key={i} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl">
                <Image src={src} alt="" fill className="object-cover" sizes="112px" />
              </div>
            ))}
          </div>

          {/* Info */}
          <GlassCard className="space-y-3 text-sm">
            <p className="flex items-start gap-2 text-muted">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {OPENING_HOURS}
            </p>
            <p className="flex items-start gap-2 text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {RESTAURANT_ADDRESS}
            </p>
            <a
              href={`tel:${RESTAURANT_PHONE}`}
              className="flex items-center gap-2 font-medium text-primary"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call restaurant
            </a>
          </GlassCard>

          <p className="text-sm leading-relaxed text-muted">{RESTAURANT_TAGLINE}</p>
        </>
      ) : data.queue.description ? (
        <GlassCard>
          <p className="text-sm text-muted">{data.queue.description}</p>
        </GlassCard>
      ) : null}
    </div>
  );
}
