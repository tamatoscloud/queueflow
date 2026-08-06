import { describe, it, expect } from 'vitest';
import {
  buildMetadataForJoin,
  metadataFromNotes,
  normalizeEntryMetadata,
} from './entry-metadata.util';

describe('entry-metadata.util', () => {
  it('parses takeaway order number from notes', () => {
    expect(metadataFromNotes('Order #4821', 'TAKEAWAY')).toEqual({
      orderNumber: '4821',
    });
  });

  it('parses drive-in vehicle from notes', () => {
    const meta = metadataFromNotes('Vehicle: Black Toyota Camry · Plate: ABC-123', 'DRIVE_IN');
    expect(meta.vehicleColor).toBe('Black');
    expect(meta.vehicleMake).toBe('Toyota Camry');
    expect(meta.vehiclePlate).toBe('ABC-123');
  });

  it('merges json metadata with notes fallback', () => {
    const meta = normalizeEntryMetadata(
      { orderNumber: '9999' },
      'Order #4821',
      'TAKEAWAY',
    );
    expect(meta.orderNumber).toBe('9999');
  });

  it('builds takeaway join metadata', () => {
    expect(
      buildMetadataForJoin('TAKEAWAY', { orderNumber: '4821' }),
    ).toEqual({ orderNumber: '4821' });
  });

  it('builds drive-in join metadata', () => {
    expect(
      buildMetadataForJoin('DRIVE_IN', {
        vehicleMake: 'Toyota',
        vehicleColor: 'Black',
        vehiclePlate: 'ABC-123',
      }),
    ).toEqual({
      vehicleMake: 'Toyota',
      vehicleColor: 'Black',
      vehiclePlate: 'ABC-123',
    });
  });
});
