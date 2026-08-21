import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWait(minutes: number): string {
  if (minutes <= 0) return 'Soon';
  if (minutes < 60) {
    const rounded =
      Math.abs(minutes - Math.round(minutes)) < 0.05
        ? Math.round(minutes)
        : Math.round(minutes * 10) / 10;
    return `${rounded} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
