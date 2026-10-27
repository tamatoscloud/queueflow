'use client';

import {
  Clock,
  MapPin,
  Phone,
  Star,
  UtensilsCrossed,
  Users,
  WifiOff,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/customer/primitives';

type EmptyVariant =
  | 'closed'
  | 'no_queue'
  | 'offline'
  | 'error'
  | 'maintenance'
  | 'notification_denied'
  | 'location_unavailable';

const CONFIG: Record<
  EmptyVariant,
  { icon: React.ComponentType<{ className?: string }>; title: string; description: string }
> = {
  closed: {
    icon: Clock,
    title: 'We\'re closed right now',
    description: 'Check our opening hours below and come back when we\'re open.',
  },
  no_queue: {
    icon: Users,
    title: 'No queue available',
    description: 'This location isn\'t accepting guests at the moment.',
  },
  offline: {
    icon: WifiOff,
    title: 'You\'re offline',
    description: 'Reconnect to join the waitlist. Your saved ticket will appear when you\'re back.',
  },
  error: {
    icon: WifiOff,
    title: 'Something went wrong',
    description: 'We couldn\'t load this page. Please try again.',
  },
  maintenance: {
    icon: Wrench,
    title: 'Brief maintenance',
    description: 'We\'ll be back in a moment. Thanks for your patience.',
  },
  notification_denied: {
    icon: Phone,
    title: 'Notifications blocked',
    description: 'Enable notifications in your browser settings so we can alert you when ready.',
  },
  location_unavailable: {
    icon: MapPin,
    title: 'Location unavailable',
    description: 'We couldn\'t detect your location. You can still join the waitlist.',
  },
};

export function PremiumEmpty({
  variant,
  action,
  onRetry,
}: {
  variant: EmptyVariant;
  action?: { label: string; href: string };
  onRetry?: () => void;
}) {
  const { icon: Icon, title, description } = CONFIG[variant];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center animate-fade-in-up">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-q-green-muted/20">
        <Icon className="h-10 w-10 text-primary" aria-hidden />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 max-w-xs text-sm text-muted">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="lg" className="rounded-2xl" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      {action ? (
        <Button variant="default" size="lg" className="rounded-2xl" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function PremiumError({
  title = 'Oops, something went wrong',
  message,
  onRetry,
  contactPhone,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  contactPhone?: string;
}) {
  return (
    <GlassCard className="text-center">
      <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted">
        {message ?? 'Please try again in a moment. Our team has been notified.'}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {onRetry ? (
          <Button variant="default" className="w-full rounded-2xl" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {contactPhone ? (
          <Button variant="outline" className="w-full rounded-2xl" asChild>
            <a href={`tel:${contactPhone}`}>
              <Phone className="mr-2 h-4 w-4" aria-hidden />
              Call restaurant
            </a>
          </Button>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function RatingStars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-sm font-semibold">{rating}</span>
      <span className="text-xs text-muted">({count.toLocaleString()} reviews)</span>
    </div>
  );
}
