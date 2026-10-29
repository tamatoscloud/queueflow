/** Guest-facing ETA bounds — keep in sync with backend wait-estimate-bounds. */
export const MIN_ESTIMATED_WAIT_MINUTES = 2.5;
export const MAX_ESTIMATED_WAIT_MINUTES = 35;

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

/**
 * Minutes a party of [partySize] takes to seat/serve: larger parties take a
 * little longer (1–2 → 2.5, 3–4 → 3.5, 5–6 → 4.5, 7+ → 5.5).
 */
export function serviceSlotForParty(partySize: number): number {
  const size = Number.isFinite(partySize) ? Math.max(1, Math.floor(partySize)) : 1;
  if (size <= 2) return 2.5;
  if (size <= 4) return 3.5;
  if (size <= 6) return 4.5;
  return 5.5;
}

/**
 * Guest-facing wait: 2.5 min per party ahead plus this party's own slot,
 * kept between 2.5 and 35 min and rounded to the nearest half minute.
 */
export function estimateWaitForGuest(customersAhead: number, partySize: number): number {
  const ahead = Number.isFinite(customersAhead) ? Math.max(0, Math.floor(customersAhead)) : 0;
  const raw = ahead * SERVICE_SLOT_MINUTES + serviceSlotForParty(partySize);
  return Math.round(clampEstimatedWaitMinutes(raw) * 2) / 2;
}

/** "2.5" / "8" — no trailing ".0". */
export function formatWaitNumber(minutes: number): string {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
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
