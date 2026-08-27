import type { EntryStatus, ServiceMode } from '@/lib/api/types';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';

export type JourneyStep =
  | 'joined'
  | 'confirmed'
  | 'waiting'
  | 'almost'
  | 'ready'
  | 'seated';

export function resolveJourneyStep(
  status: EntryStatus,
  customersAhead: number,
): JourneyStep {
  if (status === 'COMPLETED') return 'seated';
  if (status === 'CALLED') return 'ready';
  if (status === 'HOLDING') return 'almost';
  if (status === 'WAITING' && customersAhead <= 2) return 'almost';
  if (status === 'WAITING') return 'waiting';
  return 'confirmed';
}

export function getSmartWaitMessage(
  status: EntryStatus,
  customersAhead: number,
  mode?: ServiceMode,
): string {
  const copy = getServiceModeCopy(mode);

  if (status === 'CALLED') return copy.readyTitle;
  if (status === 'HOLDING') {
    return mode === 'TAKEAWAY'
      ? "We're putting the finishing touches on your order."
      : mode === 'DRIVE_IN'
        ? 'Your waiter is heading your way.'
        : "We're setting up your table now.";
  }
  if (status === 'SKIPPED' || status === 'NO_SHOW') return 'Your visit has ended.';
  if (customersAhead === 0) return "Get ready — you're next!";
  if (customersAhead === 1) return `Only 1 ${copy.aheadLabelSingular}.`;
  if (customersAhead === 2) return `Only 2 ${copy.aheadLabel}.`;
  if (customersAhead <= 3) return "You're almost up!";
  return "You're moving up nicely.";
}

/** Progress from first snapshot on this screen — not invented backend data. */
export function computeWaitProgress(initialAhead: number, currentAhead: number): number {
  if (initialAhead <= 0) return currentAhead === 0 ? 75 : 40;
  const moved = initialAhead - currentAhead;
  const pct = Math.round((moved / initialAhead) * 100);
  return Math.min(95, Math.max(5, pct));
}

export function formatConnectionLabel(
  state: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'offline',
): string {
  switch (state) {
    case 'connected':
      return 'Live';
    case 'reconnecting':
    case 'connecting':
      return 'Reconnecting…';
    case 'offline':
      return 'Offline';
    default:
      return 'Updating…';
  }
}

export function tableHoldSecondsRemaining(calledAt: string | null, holdMinutes = 2): number {
  if (!calledAt) return holdMinutes * 60;
  const elapsed = (Date.now() - new Date(calledAt).getTime()) / 1000;
  return Math.max(0, Math.floor(holdMinutes * 60 - elapsed));
}

export function formatHoldCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function journeyStepLabel(step: JourneyStep, copy: ServiceModeCopy): string {
  return copy.timeline[step];
}
