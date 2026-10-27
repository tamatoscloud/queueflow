'use client';

import Image from 'next/image';
import { isOptimizableImage } from '@/lib/images';
import { Clock, Phone } from 'lucide-react';
import type { QueueLanding } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  isRestaurantDemo,
  OPENING_HOURS,
  RESTAURANT_HERO_IMAGE_URL,
  RESTAURANT_PHONE,
} from '@/lib/demo/restaurant-content';

type QueueClosedStateProps = {
  data: QueueLanding;
};

export function QueueClosedState({ data }: QueueClosedStateProps) {
  const isRestaurant = isRestaurantDemo(data.business.name);
  const heroUrl = data.business.logoUrl ?? (isRestaurant ? RESTAURANT_HERO_IMAGE_URL : null);

  return (
    <div className="flex flex-1 flex-col gap-6 animate-fade-in-up text-center">
      <div className="relative mx-auto h-40 w-full max-w-sm overflow-hidden rounded-2xl shadow-md">
        {heroUrl ? (
          <Image src={heroUrl} alt="" fill className="object-cover" sizes="400px" unoptimized={!isOptimizableImage(heroUrl)} />
        ) : (
          <div className="h-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-lg font-bold text-white">{data.business.name}</p>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">The queue is currently closed</h1>
        <p className="mt-2 text-sm text-muted">
          {data.queue.isAcceptingEntries
            ? 'We\'re not accepting new guests right now. Please check back soon.'
            : 'This location isn\'t taking walk-ins at the moment.'}
        </p>
      </div>

      {isRestaurant ? (
        <div className="glass rounded-2xl p-4 text-left text-sm text-muted">
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {OPENING_HOURS}
          </p>
        </div>
      ) : null}

      {isRestaurant ? (
        <Button variant="outline" size="lg" className="rounded-2xl" asChild>
          <a href={`tel:${RESTAURANT_PHONE}`}>
            <Phone className="mr-2 h-4 w-4" aria-hidden />
            Call restaurant
          </a>
        </Button>
      ) : null}
    </div>
  );
}
