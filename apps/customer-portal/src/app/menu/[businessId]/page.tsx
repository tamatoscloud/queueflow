'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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

/** Tag colours from the Figma menu. */
function menuTagClass(tag: string): string {
  const t = tag.toLowerCase();
  if (t === 'popular') return 'bg-q-lime text-q-green';
  if (t === "chef's pick" || t === 'signature') return 'bg-q-green text-q-lime';
  if (t === 'spicy') return 'bg-[#fdebd8] text-[#7a3412]';
  return 'bg-q-lime-tint text-q-green';
}

export default function BusinessMenuPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return') || undefined;
  const venueHint = searchParams.get('name') || undefined;
  const enabled = isQueueUuid(businessId);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    <div className="booking-waiting flex min-h-full flex-1 flex-col">
      <GuestActiveEntryGuard returnTo={returnTo} />
      <div className="sticky top-0 z-10 bg-q-cream/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          {returnTo ? (
            <Link
              href={returnTo}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-q-line bg-white text-q-green"
              aria-label="Back to queue"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-q-green">
              Menu
            </h1>
            <p className="mt-1 truncate text-[13px] text-q-subtle">{venueName}</p>
          </div>
        </div>
        {categories.length > 1 ? (
          <nav
            className="mx-auto mt-3 flex w-full max-w-md gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
            aria-label="Menu sections"
          >
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#menu-${category.id}`}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                  (activeCategory ?? categories[0]?.id) === category.id
                    ? 'bg-q-green text-q-lime'
                    : 'border border-q-field bg-white text-q-green',
                )}
              >
                {category.name}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-2">
        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[18px] bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-7">
            {categories.map((category) => (
              <section key={category.id} id={`menu-${category.id}`} className="scroll-mt-36">
                <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-q-green">
                  {category.name}
                </h2>
                <div className="mt-3 space-y-2.5">
                  {category.items
                    .filter((item) => item.available !== false)
                    .map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[18px] border border-q-line bg-white px-4 py-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[16px] font-semibold text-q-ink">{item.name}</p>
                          <p className="shrink-0 text-[16px] font-bold text-q-green">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        {item.description ? (
                          <p className="mt-1 text-[13px] leading-snug text-q-muted">
                            {item.description}
                          </p>
                        ) : null}
                        {item.tags && item.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
                                  menuTagClass(tag),
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                </div>
              </section>
            ))}

            <p className="pb-2 text-center text-[12px] text-q-subtle">
              Prices may vary · Ask staff about allergens
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
