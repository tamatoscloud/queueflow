'use client';

import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeConnection } from '@/hooks/use-realtime-connection';
import { cn } from '@/lib/utils';

const LABELS = {
  connecting: 'Updating…',
  connected: 'Live',
  reconnecting: 'Updating…',
  disconnected: 'Updating…',
  offline: 'Offline — showing last known status',
} as const;

export function RealtimeStatusBanner({ className }: { className?: string }) {
  const state = useRealtimeConnection();

  if (state === 'connected') return null;

  const Icon = state === 'offline' ? WifiOff : state === 'reconnecting' || state === 'connecting' ? Loader2 : Wifi;

  return (
    <div
      className={cn(
        'border-b px-4 py-2 text-center text-xs font-medium',
        state === 'offline' && 'border-amber-200 bg-amber-50 text-amber-900',
        state === 'disconnected' && 'border-slate-100 bg-slate-50 text-slate-600',
        (state === 'connecting' || state === 'reconnecting') &&
          'border-slate-100 bg-slate-50 text-slate-600',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', (state === 'reconnecting' || state === 'connecting') && 'animate-spin')} aria-hidden />
        {LABELS[state]}
      </span>
    </div>
  );
}
