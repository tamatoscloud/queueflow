import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWait(minutes: number): string {
  if (minutes <= 0) return 'Soon';
  if (minutes < 60) {
    // Guest-facing waits use whole minutes (no "26.7 min").
    return `${Math.max(1, Math.round(minutes))} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
