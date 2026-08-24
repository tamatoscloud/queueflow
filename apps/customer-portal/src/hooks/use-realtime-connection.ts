'use client';

import { useEffect, useState } from 'react';
import {
  getRealtimeConnectionState,
  getSharedSocket,
  onRealtimeConnectionState,
} from '@/lib/realtime/socket-client';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';

export function useRealtimeConnection(): RealtimeConnectionState {
  const [state, setState] = useState<RealtimeConnectionState>('disconnected');

  useEffect(() => {
    // Ensure the shared socket is created; otherwise the banner can stay on
    // "Updating…" forever when no other subscriber has connected yet.
    getSharedSocket();
    setState(getRealtimeConnectionState());
    return onRealtimeConnectionState(setState);
  }, []);

  return state;
}
