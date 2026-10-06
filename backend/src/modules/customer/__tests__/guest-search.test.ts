import { describe, expect, it } from 'vitest';
import {
  parseGuestSearchQuery,
  queueTokenSearchWhere,
} from '../guest-search';

describe('parseGuestSearchQuery', () => {
  it('treats a floor ticket number as token 74', () => {
    const parsed = parseGuestSearchQuery('74');
    expect(parsed.isTicketLike).toBe(true);
    expect(parsed.tokenNumber).toBe(74);
    expect(parsed.displayCodeVariants).toEqual(
      expect.arrayContaining(['74', '074']),
    );
  });

  it('strips a leading hash', () => {
    const parsed = parseGuestSearchQuery('#74');
    expect(parsed.text).toBe('74');
    expect(parsed.tokenNumber).toBe(74);
  });

  it('expands prefixed display codes', () => {
    const parsed = parseGuestSearchQuery('a-74');
    expect(parsed.tokenNumber).toBe(74);
    expect(parsed.displayCodeVariants).toEqual(
      expect.arrayContaining(['A-074', 'A-74', '74']),
    );
  });

  it('does not treat a guest name as a ticket', () => {
    const parsed = parseGuestSearchQuery('Maria');
    expect(parsed.isTicketLike).toBe(false);
    expect(parsed.tokenNumber).toBeNull();
  });
});

describe('queueTokenSearchWhere', () => {
  it('matches numeric tickets by tokenNumber, not substring 174', () => {
    const where = queueTokenSearchWhere('74');
    expect(where?.OR).toEqual(
      expect.arrayContaining([{ tokenNumber: 74 }]),
    );
    const contains = (where?.OR ?? []).some((clause) => {
      const displayCode = clause.displayCode;
      return (
        typeof displayCode === 'object' &&
        displayCode !== null &&
        'contains' in displayCode
      );
    });
    expect(contains).toBe(false);
  });

  it('returns null for blank input', () => {
    expect(queueTokenSearchWhere('   ')).toBeNull();
  });
});
