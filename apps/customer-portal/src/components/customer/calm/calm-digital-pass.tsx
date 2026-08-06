'use client';

import type { ServiceMode } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { formatAhead, formatWaitMinutes } from '@/lib/restaurant/service-mode-config';
import { formatConnectionLabel } from '@/lib/waiting/wait-helpers';
import { CalmCard, CalmLivePill } from '@/components/customer/calm/primitives';
import { cn } from '@/lib/utils';

type CalmDigitalPassProps = {
  restaurantName: string;
  displayCode: string;
  partySize: number;
  customersAhead: number;
  estimatedWaitMinutes: number;
  connection: RealtimeConnectionState;
  copy: ServiceModeCopy;
  serviceMode: ServiceMode;
  contextLine?: string | null;
  className?: string;
};

export function CalmDigitalPass({
  restaurantName,
  displayCode,
  partySize,
  customersAhead,
  estimatedWaitMinutes,
  connection,
  copy,
  serviceMode,
  contextLine,
  className,
}: CalmDigitalPassProps) {
  const aheadText = formatAhead(customersAhead, copy);
  const waitText = formatWaitMinutes(estimatedWaitMinutes, copy);
  const connectionLabel = formatConnectionLabel(connection);
  const showParty = serviceMode === 'DINE_IN';

  return (
    <CalmCard highlighted className={cn('text-center', className)} aria-label="Your queue pass">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b6870]">
        {restaurantName}
      </p>
      <p className="mt-3 font-display text-4xl font-bold tracking-tight text-[#8b7cf8]">
        {displayCode}
      </p>
      {contextLine ? (
        <p className="mt-2 text-sm font-medium text-[#17151a]">{contextLine}</p>
      ) : showParty ? (
        <p className="mt-2 text-sm text-[#6b6870]">Party of {partySize}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <span className="font-semibold text-[#17151a]">{aheadText}</span>
        <span className="text-[#6b6870]">·</span>
        <span className="font-semibold text-[#17151a]">{waitText}</span>
      </div>
      <div className="mt-4 flex justify-center">
        <CalmLivePill label={connectionLabel} />
      </div>
    </CalmCard>
  );
}
