/** Guest-facing ETA bounds (minutes). */
export const MIN_ESTIMATED_WAIT_MINUTES = 2.5;
export const MAX_ESTIMATED_WAIT_MINUTES = 30;

/** Minutes added per party in line (1st = 2.5, 2nd = 5, 3rd = 7.5, …). */
export const SERVICE_SLOT_MINUTES = 2.5;

/**
 * Clamp a raw wait estimate into the guest-facing range.
 * Non-positive / non-finite values become the minimum (never show 0 while waiting).
 */
export function clampEstimatedWaitMinutes(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return MIN_ESTIMATED_WAIT_MINUTES;
  }
  return Math.min(
    MAX_ESTIMATED_WAIT_MINUTES,
    Math.max(MIN_ESTIMATED_WAIT_MINUTES, raw),
  );
}

/**
 * Position 1 → 2.5, position 2 → 5, position 3 → 7.5, …
 */
export function estimateWaitMinutesForPosition(position: number): number {
  const pos = Math.max(1, Math.floor(position));
  return clampEstimatedWaitMinutes(pos * SERVICE_SLOT_MINUTES);
}

/** Same as position formula: ahead 0 → 2.5, ahead 1 → 5, ahead 2 → 7.5. */
export function estimateWaitMinutesForCustomersAhead(
  customersAhead: number,
): number {
  return estimateWaitMinutesForPosition(Math.max(0, customersAhead) + 1);
}
