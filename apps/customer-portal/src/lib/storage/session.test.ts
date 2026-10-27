import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureTrackingTokenFromUrl,
  getTrackingTokenForEntry,
  loadQueueSession,
  saveQueueSession,
} from './session';

const ENTRY = '00000000-0000-4000-8000-000000000040';

describe('tracking token from #t= links', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('stores the fragment token and strips it from the address bar', () => {
    window.history.replaceState(null, '', `/track/${ENTRY}?utm=wa#t=abc.def.ghi`);
    captureTrackingTokenFromUrl(ENTRY);
    expect(loadQueueSession()?.trackingToken).toBe('abc.def.ghi');
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?utm=wa');
  });

  it('keeps other fragment params', () => {
    window.history.replaceState(null, '', `/feedback/${ENTRY}#t=tok&x=1`);
    captureTrackingTokenFromUrl(ENTRY);
    expect(window.location.hash).toBe('#x=1');
  });

  it('returns the session token only for the matching entry', () => {
    saveQueueSession({
      entryId: ENTRY,
      queueId: 'q',
      displayCode: 'A-01',
      joinedAt: new Date().toISOString(),
      trackingToken: 'mine',
    });
    expect(getTrackingTokenForEntry(ENTRY)).toBe('mine');
    expect(getTrackingTokenForEntry('00000000-0000-4000-8000-000000000099')).toBeUndefined();
  });
});
