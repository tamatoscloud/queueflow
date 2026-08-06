'use client';

import { CalmOffline } from '@/components/customer/calm/calm-offline';
import { BookingShell } from '@/components/layout/booking-shell';

export default function OfflinePage() {
  return (
    <BookingShell>
      <CalmOffline onRetry={() => window.location.reload()} />
    </BookingShell>
  );
}
