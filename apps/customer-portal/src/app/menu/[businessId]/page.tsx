'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { BookingShell } from '@/components/layout/booking-shell';
import { GuestActiveEntryGuard } from '@/components/customer/guest-active-entry-guard';
import { customerApi } from '@/lib/api/customer-api';
import { DEFAULT_GUEST_MENU } from '@/lib/demo/guest-menu';
import { isQueueUuid } from '@/lib/queue-id';
import { cn } from '@/lib/utils';

function formatPrice(price: string): string {
  const trimmed = price.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$') || trimmed.startsWith('Rs') || trimmed.startsWith('PKR')) {
    return trimmed;
  }
  return `$${trimmed}`;
}

export default function BusinessMenuPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return') || undefined;
  const venueHint = searchParams.get('name') || undefined;
  const enabled = isQueueUuid(businessId);

  const { data, isLoading } = useQuery({
    queryKey: ['business-menu', businessId],
    queryFn: () => customerApi.getBusinessMenu(businessId),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const menu = data?.menu ?? DEFAULT_GUEST_MENU;
  const venueName = data?.businessName ?? venueHint ?? 'Menu';
  const categories = useMemo(
    () => menu.categories.filter((c) => c.items.some((i) => i.available !== false)),
    [menu],
  );

  return (
    <BookingShell variant="waiting" showJazzPill>
      <GuestActiveEntryGuard returnTo={returnTo} />
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          {returnTo ? (
            <Link
              href={returnTo}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ececf0] bg-white text-black"
              aria-label="Back to queue"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-bold leading-tight text-black">
              Menu
            </h1>
            <p className="truncate text-[13px] text-[#6b7280]">{venueName}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#f3f0ff]" />
            ))}
          </div>
        ) : (
          <div className="space-y-8 pb-8">
            {categories.map((category) => (
              <section key={category.id}>
                <h2 className="font-display text-[22px] font-bold text-black">
                  {category.name}
                </h2>
                <div className="mt-3 space-y-2.5">
                  {category.items
                    .filter((item) => item.available !== false)
                    .map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl bg-[#f3f0ff] px-4 py-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-bold text-black">{item.name}</p>
                            {item.description ? (
                              <p className="mt-1 text-[12px] leading-snug text-[#6b7280]">
                                {item.description}
                              </p>
                            ) : null}
                            {item.tags && item.tags.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={cn(
                                      'rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9b8cff]',
                                    )}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <p className="shrink-0 font-display text-[17px] font-bold text-black">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ))}

            <p className="text-center text-[11px] text-[#9ca3af]">
              Prices may vary · Ask staff about allergens
            </p>
          </div>
        )}
      </div>
    </BookingShell>
  );
}
