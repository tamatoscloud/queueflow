import type { ServiceMode } from '@prisma/client';

export type QueueEntryMetadata = {
  orderNumber?: string;
  vehicleMake?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
  note?: string;
};

/** Parse legacy notes strings from seed / pre-2F joins. */
export function metadataFromNotes(
  notes: string | null | undefined,
  serviceMode?: ServiceMode,
): QueueEntryMetadata {
  if (!notes?.trim()) return {};
  const meta: QueueEntryMetadata = {};
  const orderMatch = notes.match(/Order\s*#?\s*([A-Za-z0-9-]+)/i);
  if (orderMatch?.[1]) meta.orderNumber = orderMatch[1];
  const vehicleMatch = notes.match(/Vehicle:\s*([^·]+)/i);
  if (vehicleMatch?.[1]) {
    const vehicle = vehicleMatch[1].trim();
    const plateMatch = notes.match(/Plate:\s*([^·]+)/i);
    if (plateMatch?.[1]) meta.vehiclePlate = plateMatch[1].trim();
    const colorParts = vehicle.split(/\s+/);
    if (colorParts.length >= 2) {
      meta.vehicleColor = colorParts[0];
      meta.vehicleMake = colorParts.slice(1).join(' ');
    } else {
      meta.vehicleMake = vehicle;
    }
  }
  if (!orderMatch && !vehicleMatch && serviceMode === 'DINE_IN') {
    meta.note = notes.trim();
  }
  return meta;
}

export function normalizeEntryMetadata(
  raw: unknown,
  notes: string | null | undefined,
  serviceMode?: ServiceMode,
): QueueEntryMetadata {
  const fromJson =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const merged: QueueEntryMetadata = {
    ...metadataFromNotes(notes, serviceMode),
    ...(fromJson.orderNumber ? { orderNumber: String(fromJson.orderNumber) } : {}),
    ...(fromJson.vehicleMake ? { vehicleMake: String(fromJson.vehicleMake) } : {}),
    ...(fromJson.vehicleColor ? { vehicleColor: String(fromJson.vehicleColor) } : {}),
    ...(fromJson.vehiclePlate ? { vehiclePlate: String(fromJson.vehiclePlate) } : {}),
    ...(fromJson.note ? { note: String(fromJson.note) } : {}),
  };

  return merged;
}

export function buildMetadataForJoin(
  serviceMode: ServiceMode,
  input: {
    orderNumber?: string;
    vehicleMake?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    note?: string;
  },
): QueueEntryMetadata | undefined {
  switch (serviceMode) {
    case 'TAKEAWAY':
      if (!input.orderNumber?.trim()) return undefined;
      return {
        orderNumber: input.orderNumber.trim(),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      };
    case 'DRIVE_IN': {
      const vehicleMake = input.vehicleMake?.trim();
      if (!vehicleMake) return undefined;
      return {
        vehicleMake,
        ...(input.vehicleColor?.trim() ? { vehicleColor: input.vehicleColor.trim() } : {}),
        ...(input.vehiclePlate?.trim() ? { vehiclePlate: input.vehiclePlate.trim() } : {}),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      };
    }
    default:
      return input.note?.trim() ? { note: input.note.trim() } : undefined;
  }
}
