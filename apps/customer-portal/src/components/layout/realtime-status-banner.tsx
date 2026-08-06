'use client';

import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeConnection } from '@/hooks/use-realtime-connection';
import { cn } from '@/lib/utils';

const LABELS = {
  connecting: 'Connecting to live updates…',
  connected: 'Live updates active',
  reconnecting: 'Reconnecting…',
  disconnected: 'Using backup refresh',
  offline: 'Offline — showing last known data',
} as const;

export function RealtimeStatusBanner({ className }: { className?: string }) {
  const state = useRealtimeConnection();

  if (state === 'connected') return null;

  const Icon = state === 'offline' || state === 'disconnected' ? WifiOff : state === 'reconnecting' ? Loader2 : Wifi;

  return (
    <div
      className={cn(
        'border-b px-4 py-2 text-center text-xs font-medium',
        state === 'offline' && 'border-amber-200 bg-amber-50 text-amber-900',
        state === 'disconnected' && 'border-slate-200 bg-slate-100 text-slate-700',
        (state === 'connecting' || state === 'reconnecting') &&
          'border-blue-200 bg-blue-50 text-blue-800',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', state === 'reconnecting' && 'animate-spin')} aria-hidden />
        {LABELS[state]}
      </span>
    </div>
  );
}
