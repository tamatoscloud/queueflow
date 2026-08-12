import { describe, expect, it } from 'vitest';
import { joinQueueSchema, feedbackSchema, buildJoinNotes } from '@/lib/schemas/forms';

describe('joinQueueSchema', () => {
  it('accepts valid join payload', () => {
    const result = joinQueueSchema.safeParse({
      fullName: 'Jane Doe',
      phone: '+923001234567',
      partySize: 2,
      notes: 'Window seat',
      notificationPreference: 'WHATSAPP',
    });
    expect(result.success).toBe(true);
  });

  it('accepts restaurant demo fields', () => {
    const result = joinQueueSchema.safeParse({
      fullName: 'Jane Doe',
      phone: '+923001234567',
      partySize: 4,
      notificationPreference: 'BOTH',
      occasion: 'Birthday',
      seatingPreference: 'Outdoor',
      whatsappNumber: '+923009876543',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = joinQueueSchema.safeParse({
      fullName: 'J',
      phone: '+923001234567',
      partySize: 1,
      notificationPreference: 'SMS',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const result = joinQueueSchema.safeParse({
      fullName: 'Jane Doe',
      phone: 'abc',
      partySize: 1,
      notificationPreference: 'BOTH',
    });
    expect(result.success).toBe(false);
  });
});

describe('buildJoinNotes', () => {
  it('formats restaurant fields into notes string', () => {
    expect(
      buildJoinNotes({
        occasion: 'Birthday',
        seatingPreference: 'Outdoor',
        whatsappNumber: '+923009876543',
        notes: 'Nut allergy',
      }),
    ).toBe('Occasion: Birthday · Seating: Outdoor · WhatsApp: +923009876543 · Nut allergy');
  });

  it('returns undefined when no fields provided', () => {
    expect(buildJoinNotes({})).toBeUndefined();
  });
});

describe('feedbackSchema', () => {
  it('requires rating between 1 and 5', () => {
    expect(feedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ rating: 4, comment: 'Great!' }).success).toBe(true);
  });
});
