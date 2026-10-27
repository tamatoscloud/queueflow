const KEY = 'queueflow.session';

export interface QueueSession {
  entryId: string;
  queueId: string;
  displayCode: string;
  joinedAt: string;
  /** Epoch ms when the guest ETA countdown should hit zero (set at join). */
  waitDeadlineAt?: number;
  /** Last server estimate (minutes) used to (re)anchor the deadline. */
  waitEstimateMinutes?: number;
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

/**
 * Guest links sent by push, WhatsApp or SMS carry the tracking token in the
 * URL fragment (`#t=…`). Fragments never reach servers or Referer headers.
 * Store it for this entry and strip it from the address bar so it isn't
 * copied along when the guest shares the page.
 */
export function captureTrackingTokenFromUrl(entryId: string): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash.startsWith('#')) return;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('t');
  if (!token) return;
  saveTrackingTokenForEntry(entryId, token);
  params.delete('t');
  const rest = params.toString();
  const clean = `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ''}`;
  window.history.replaceState(window.history.state, '', clean);
}

/** Tracking token this tab holds for `entryId`, if any. */
export function getTrackingTokenForEntry(entryId: string): string | undefined {
  captureTrackingTokenFromUrl(entryId);
  const session = loadQueueSession();
  return session?.entryId === entryId ? session.trackingToken : undefined;
}
