'use client';

import { useEffect, useState } from 'react';
import {
  getRealtimeConnectionState,
  onRealtimeConnectionState,
} from '@/lib/realtime/socket-client';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';

/**
 * Observes socket state without forcing a connection.
 * Only pages that actually subscribe (track/join) should open the socket.
 */
export function useRealtimeConnection(): RealtimeConnectionState {
  const [state, setState] = useState<RealtimeConnectionState>('disconnected');

  useEffect(() => {
    setState(getRealtimeConnectionState());
    return onRealtimeConnectionState(setState);
  }, []);

  return state;
}
