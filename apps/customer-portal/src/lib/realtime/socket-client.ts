import { io, type Socket } from 'socket.io-client';
import type { RealtimeConnectionState } from './socket-events';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_API_WS_URL) {
    return process.env.NEXT_PUBLIC_API_WS_URL;
  }
  try {
    const url = new URL(API_BASE);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

let sharedSocket: Socket | null = null;
const stateListeners = new Set<(state: RealtimeConnectionState) => void>();
let connectionState: RealtimeConnectionState = 'disconnected';

function setState(state: RealtimeConnectionState): void {
  connectionState = state;
  for (const listener of stateListeners) {
    listener(state);
  }
}

export function getRealtimeConnectionState(): RealtimeConnectionState {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline';
  }
  return connectionState;
}

export function onRealtimeConnectionState(listener: (state: RealtimeConnectionState) => void): () => void {
  stateListeners.add(listener);
  listener(getRealtimeConnectionState());
  return () => stateListeners.delete(listener);
}

export function getSharedSocket(): Socket {
  if (sharedSocket) return sharedSocket;

  sharedSocket = io(`${resolveSocketUrl()}/realtime`, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  sharedSocket.on('connect', () => setState('connected'));
  sharedSocket.io.on('reconnect_attempt', () => setState('reconnecting'));
  sharedSocket.on('disconnect', () => {
    setState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'disconnected');
  });
  sharedSocket.on('connect_error', () => setState('reconnecting'));

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (!sharedSocket?.connected) {
        setState('reconnecting');
        sharedSocket?.connect();
      }
    });
    window.addEventListener('offline', () => setState('offline'));
  }

  setState('connecting');
  return sharedSocket;
}

export function disconnectSharedSocket(): void {
  sharedSocket?.disconnect();
  sharedSocket = null;
  setState('disconnected');
}
