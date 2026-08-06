const KEY = 'queueflow.session';

export interface QueueSession {
  entryId: string;
  queueId: string;
  displayCode: string;
  joinedAt: string;
  fullName?: string;
  phone?: string;
}

export function saveQueueSession(session: QueueSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function loadQueueSession(): QueueSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QueueSession;
  } catch {
    return null;
  }
}

export function clearQueueSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
