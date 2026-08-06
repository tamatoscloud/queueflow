'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalmFeedback } from '@/components/customer/calm/calm-feedback';
import { BookingShell } from '@/components/layout/booking-shell';

export default function FeedbackPage() {
  const { entryId } = useParams<{ entryId: string }>();

  return (
    <BookingShell>
      <CalmFeedback entryId={entryId} />
      <Link
        href={`/completed/${entryId}`}
        className="mt-4 block text-center text-sm font-medium text-[#8b7cf8]"
      >
        Back
      </Link>
    </BookingShell>
  );
}
