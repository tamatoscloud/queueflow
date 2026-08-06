'use client';

import type { QueueLanding } from '@/lib/api/types';
import { primaryServiceMode } from '@/lib/restaurant/service-modes';
import { RestaurantLanding } from '@/components/customer/restaurant-landing';
import { TakeawayLanding } from '@/components/customer/takeaway-landing';
import { DriveInLanding } from '@/components/customer/drive-in-landing';

export function ModeLanding({ data, queueId }: { data: QueueLanding; queueId: string }) {
  const mode = primaryServiceMode(
    data.queue.serviceMode ?? 'DINE_IN',
    data.business.enabledModes,
  );

  switch (mode) {
    case 'TAKEAWAY':
      return <TakeawayLanding data={data} queueId={queueId} />;
    case 'DRIVE_IN':
      return <DriveInLanding data={data} queueId={queueId} />;
    case 'DINE_IN':
    default:
      return <RestaurantLanding data={data} queueId={queueId} />;
  }
}
