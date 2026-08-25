/** Guest-facing ETA bounds — keep in sync with backend wait-estimate-bounds. */
export const MIN_ESTIMATED_WAIT_MINUTES = 2.5;
export const MAX_ESTIMATED_WAIT_MINUTES = 30;

/** Minutes added per party in line (1st = 2.5, 2nd = 5, 3rd = 7.5, …). */
export const SERVICE_SLOT_MINUTES = 2.5;

export function clampEstimatedWaitMinutes(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return MIN_ESTIMATED_WAIT_MINUTES;
  }
  return Math.min(
    MAX_ESTIMATED_WAIT_MINUTES,
    Math.max(MIN_ESTIMATED_WAIT_MINUTES, raw),
  );
}

/** Position 1 → 2.5, position 2 → 5, position 3 → 7.5, … */
export function estimateWaitMinutesForPosition(position: number): number {
  const pos = Math.max(1, Math.floor(position));
  return clampEstimatedWaitMinutes(pos * SERVICE_SLOT_MINUTES);
}

/** Ahead 0 → 2.5, ahead 1 → 5, ahead 2 → 7.5. */
export function estimateWaitMinutesForCustomersAhead(
  customersAhead: number,
): number {
  return estimateWaitMinutesForPosition(Math.max(0, customersAhead) + 1);
}

/** Format a minute value for static labels (landing, etc.). */
export function formatEstimatedWaitLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Soon';
  const clamped = clampEstimatedWaitMinutes(minutes);
  if (Number.isInteger(clamped)) return `${clamped} min`;
  return `${clamped} min`;
}

/** mm:ss from remaining seconds. */
export function formatCountdownClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
