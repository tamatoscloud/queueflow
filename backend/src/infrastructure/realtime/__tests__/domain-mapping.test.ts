import { describe, expect, it } from 'vitest';
import { DOMAIN_TO_REALTIME, WAIT_AFFECTING_DOMAIN_EVENTS } from '../constants/domain-mapping';
import { RealtimeEvents } from '../constants/socket-events';

describe('domain mapping', () => {
  it('maps all required customer-facing events', () => {
    expect(DOMAIN_TO_REALTIME.CustomerJoined).toBe(RealtimeEvents.CustomerJoined);
    expect(DOMAIN_TO_REALTIME.CustomerCalled).toBe(RealtimeEvents.CustomerCalled);
    expect(DOMAIN_TO_REALTIME.CustomerHeld).toBe(RealtimeEvents.CustomerHeld);
    expect(DOMAIN_TO_REALTIME.CustomerSkipped).toBe(RealtimeEvents.CustomerSkipped);
    expect(DOMAIN_TO_REALTIME.CustomerCompleted).toBe(RealtimeEvents.CustomerCompleted);
    expect(DOMAIN_TO_REALTIME.QueuePaused).toBe(RealtimeEvents.QueuePaused);
    expect(DOMAIN_TO_REALTIME.QueueResumed).toBe(RealtimeEvents.QueueResumed);
    expect(DOMAIN_TO_REALTIME.QueueClosed).toBe(RealtimeEvents.QueueClosed);
    expect(DOMAIN_TO_REALTIME.QueueUpdated).toBe(RealtimeEvents.QueueUpdated);
  });

  it('marks join and complete as wait-affecting', () => {
    expect(WAIT_AFFECTING_DOMAIN_EVENTS.has('CustomerJoined')).toBe(true);
    expect(WAIT_AFFECTING_DOMAIN_EVENTS.has('CustomerCompleted')).toBe(true);
    expect(WAIT_AFFECTING_DOMAIN_EVENTS.has('QueuePaused')).toBe(true);
  });
});
