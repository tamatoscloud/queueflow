import { describe, expect, it } from 'vitest';
import { RealtimeRooms } from '../constants/rooms';

describe('RealtimeRooms', () => {
  it('builds stable room names', () => {
    expect(RealtimeRooms.queue('q-1')).toBe('queue:q-1');
    expect(RealtimeRooms.entry('e-1')).toBe('entry:e-1');
    expect(RealtimeRooms.businessDashboard('b-1')).toBe('business:b-1:dashboard');
    expect(RealtimeRooms.businessQueues('b-1')).toBe('business:b-1:queues');
    expect(RealtimeRooms.queueDetail('q-1')).toBe('queue:q-1:detail');
    expect(RealtimeRooms.queueDisplay('q-1')).toBe('queue:q-1:display');
  });
});
