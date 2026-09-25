'use client';

import { useRouter } from 'next/navigation';
import type { QueueSession } from '@/lib/storage/session';
import { clearQueueSession } from '@/lib/storage/session';
import { CalmCard, CalmHeading } from '@/components/customer/calm/primitives';

export function CalmReturningCustomer({
  session,
  businessName,
  displayCode,
  queueId,
  onJoinAsSomeoneElse,
}: {
  session: QueueSession;
  businessName: string;
  displayCode: string;
  queueId: string;
  /** Called after local session is cleared so parent state can show the join form. */
  onJoinAsSomeoneElse?: () => void;
}) {
  const router = useRouter();

  function joinAsSomeoneElse() {
    clearQueueSession();
    onJoinAsSomeoneElse?.();
    router.push(`/q/${queueId}/join?fresh=1`);
  }

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
        <p className="mt-2 font-display text-4xl font-bold text-[var(--brand-forest)]">{displayCode}</p>
        <p className="mt-3 text-sm text-[#6b6870]">We&apos;ll notify you when it&apos;s your turn.</p>
      </CalmCard>

      <button
        type="button"
        onClick={() => router.push(`/track/${session.entryId}`)}
        className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--primary)] text-base font-semibold text-[var(--on-primary)] shadow-sm transition-opacity hover:opacity-95"
      >
        Continue tracking
      </button>

      <button
        type="button"
        onClick={joinAsSomeoneElse}
        className="block w-full text-center text-sm font-medium text-[var(--brand-forest)]"
      >
        Join as someone else
      </button>
    </div>
  );
}
