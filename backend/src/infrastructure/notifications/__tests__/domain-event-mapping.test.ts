import { describe, it, expect } from 'vitest';
import {
  DOMAIN_TO_NOTIFICATION_TYPE,
  WAIT_NOTIFICATION_EVENTS,
} from '../constants/domain-event-mapping';

describe('domain event notification mapping', () => {
  it('maps CustomerJoined to QUEUE_JOINED', () => {
    expect(DOMAIN_TO_NOTIFICATION_TYPE.CustomerJoined).toBe('QUEUE_JOINED');
  });

  it('maps CustomerCalled to YOUR_TURN', () => {
    expect(DOMAIN_TO_NOTIFICATION_TYPE.CustomerCalled).toBe('YOUR_TURN');
  });

  it('maps hold / no-show / skip to CUSTOM so SMS still fires', () => {
    expect(DOMAIN_TO_NOTIFICATION_TYPE.CustomerHeld).toBe('CUSTOM');
    expect(DOMAIN_TO_NOTIFICATION_TYPE.CustomerNoShow).toBe('CUSTOM');
    expect(DOMAIN_TO_NOTIFICATION_TYPE.CustomerSkipped).toBe('CUSTOM');
  });

  it('includes queue lifecycle events in wait notifications', () => {
    expect(WAIT_NOTIFICATION_EVENTS.has('QueuePaused')).toBe(true);
    expect(WAIT_NOTIFICATION_EVENTS.has('QueueResumed')).toBe(true);
    expect(WAIT_NOTIFICATION_EVENTS.has('QueueClosed')).toBe(true);
  });
});
