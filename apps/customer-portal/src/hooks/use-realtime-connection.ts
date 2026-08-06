'use client';

import { useEffect, useState } from 'react';
import {
  getRealtimeConnectionState,
  onRealtimeConnectionState,
} from '@/lib/realtime/socket-client';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';

export function useRealtimeConnection(): RealtimeConnectionState {
  const [state, setState] = useState<RealtimeConnectionState>('disconnected');

  useEffect(() => {
    setState(getRealtimeConnectionState());
    return onRealtimeConnectionState(setState);
  }, []);

  return state;
}
