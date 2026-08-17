'use client';

import Link from 'next/link';
import type { QueueSession } from '@/lib/storage/session';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';

export function CalmReturningCustomer({
  session,
  businessName,
  displayCode,
  queueId,
}: {
  session: QueueSession;
  businessName: string;
  displayCode: string;
  queueId: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="text-center">
        <CalmHeading accent="!">You&apos;re already in the queue</CalmHeading>
        <p className="mt-2 text-sm text-[#6b6870]">
          {businessName} is already looking after your spot.
        </p>
      </div>

      <CalmCard highlighted className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6870]">Your number</p>
        <p className="mt-2 font-display text-4xl font-bold text-[var(--primary)]">{displayCode}</p>
        <p className="mt-3 text-sm text-[#6b6870]">We&apos;ll notify you when it&apos;s your turn.</p>
      </CalmCard>

      <Link
        href={`/track/${session.entryId}`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--primary)] text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
      >
        Continue tracking
      </Link>

      <Link href={`/q/${queueId}/join`} className="block text-center text-sm font-medium text-[var(--primary)]">
        Join as someone else
      </Link>
    </div>
  );
}
