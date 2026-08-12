const KEY = 'queueflow.session';

export interface QueueSession {
  entryId: string;
  queueId: string;
  displayCode: string;
  joinedAt: string;
  /** Entry-scoped Socket.IO credential — never put in URL or logs. */
  trackingToken?: string;
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

/**
 * Persist a recovered trackingToken for the active entry.
 * Creates/updates the session for this entryId without logging the token.
 */
export function saveTrackingTokenForEntry(
  entryId: string,
  trackingToken: string,
  extras?: Partial<Pick<QueueSession, 'queueId' | 'displayCode'>>,
): void {
  if (typeof window === 'undefined') return;
  const existing = loadQueueSession();
  if (existing?.entryId === entryId) {
    saveQueueSession({ ...existing, trackingToken });
    return;
  }
  saveQueueSession({
    entryId,
    queueId: extras?.queueId ?? existing?.queueId ?? '',
    displayCode: extras?.displayCode ?? existing?.displayCode ?? '',
    joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    trackingToken,
    fullName: existing?.fullName,
    phone: existing?.phone,
  });
}
