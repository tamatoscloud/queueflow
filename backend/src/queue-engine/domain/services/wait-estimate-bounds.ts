/** Guest-facing ETA bounds (minutes). */
export const MIN_ESTIMATED_WAIT_MINUTES = 2.5;
export const MAX_ESTIMATED_WAIT_MINUTES = 30;

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
