import { describe, expect, it } from 'vitest';
import { entryIdFromReturnPath } from '@/components/customer/guest-active-entry-guard';

describe('entryIdFromReturnPath', () => {
  it('extracts track entry id from return query', () => {
    expect(
      entryIdFromReturnPath('/track/5354156e-0e46-41a1-ab49-8c6dd9ac80f7'),
    ).toBe('5354156e-0e46-41a1-ab49-8c6dd9ac80f7');
  });

  it('returns null for missing or invalid paths', () => {
    expect(entryIdFromReturnPath(undefined)).toBeNull();
    expect(entryIdFromReturnPath('/menu/abc')).toBeNull();
    expect(entryIdFromReturnPath('/track/not-a-uuid')).toBeNull();
  });
});
