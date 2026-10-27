'use client';

import Image from 'next/image';
import { isOptimizableImage } from '@/lib/images';
import type { QueueLanding } from '@/lib/api/types';
import { RatingStars } from '@/components/customer/premium-states';
import { BusyMeter } from '@/components/customer/busy-meter';
import {
  isRestaurantDemo,
  RESTAURANT_HERO_IMAGE_URL,
  RESTAURANT_RATING,
  RESTAURANT_REVIEW_COUNT,
} from '@/lib/demo/restaurant-content';
import { cn } from '@/lib/utils';

type QueueJoinHeroProps = {
  data: QueueLanding;
  className?: string;
};

function cuisineLabel(data: QueueLanding): string {
  if (isRestaurantDemo(data.business.name)) return 'Italian';
  if (data.business.businessType === 'CAFE') return 'Café';
  if (data.business.businessType === 'FOOD_COURT') return 'Food court';
  return data.queue.name;
}

export function QueueJoinHero({ data, className }: QueueJoinHeroProps) {
  const isRestaurant = isRestaurantDemo(data.business.name);
  const heroUrl = data.business.logoUrl ?? (isRestaurant ? RESTAURANT_HERO_IMAGE_URL : null);
  const isOpen = data.live.isOpen;

  return (
    <section className={cn('animate-fade-in-up', className)}>
      <div className="relative mb-4 h-36 overflow-hidden rounded-2xl shadow-md">
        {heroUrl ? (
          <Image src={heroUrl} alt="" fill className="object-cover" priority sizes="100vw" unoptimized={!isOptimizableImage(heroUrl)} />
        ) : (
          <div className="h-full bg-gradient-to-br from-primary/30 via-secondary/20 to-q-green-muted/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h2 className="text-lg font-bold text-white drop-shadow-sm">{data.business.name}</h2>
          {data.branch.city ? (
            <p className="text-xs text-white/80">{data.branch.name}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {isRestaurant ? (
          <RatingStars rating={RESTAURANT_RATING} count={RESTAURANT_REVIEW_COUNT} />
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{cuisineLabel(data)}</span>
          <span aria-hidden>·</span>
          <span
            className={cn(
              'font-semibold',
              isOpen ? 'text-success' : 'text-danger',
            )}
          >
            {isOpen ? 'Open now' : 'Closed'}
          </span>
          {isOpen ? <BusyMeter waitingCount={data.live.waitingCount} /> : null}
        </div>
      </div>
    </section>
  );
}
