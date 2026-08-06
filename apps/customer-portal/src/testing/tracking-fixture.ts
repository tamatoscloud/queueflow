import type { EntryTracking } from '@/lib/api/types';

export function makeTracking(overrides: Partial<EntryTracking> = {}): EntryTracking {
  return {
    entry: {
      id: 'entry-1',
      status: 'WAITING',
      displayCode: 'W-123',
      partySize: 2,
      joinedAt: new Date().toISOString(),
      calledAt: null,
      ...overrides.entry,
    },
    queue: {
      id: 'queue-1',
      name: 'Main Queue',
      status: 'ACTIVE',
      isAcceptingEntries: true,
      ...overrides.queue,
    },
    business: {
      id: 'biz-1',
      name: 'Black Stone Café',
      logoUrl: null,
      ...overrides.business,
    },
    branch: {
      id: 'branch-1',
      name: 'Bahadurabad, Karachi',
      ...overrides.branch,
    },
    position: 4,
    customersAhead: 3,
    estimatedWaitMinutes: 18,
    averageServiceTimeMinutes: 6,
    snapshotGeneratedAt: new Date().toISOString(),
    ...overrides,
  };
}
