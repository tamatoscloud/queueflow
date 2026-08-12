import { z } from 'zod';
import type { ServiceMode } from '@/lib/api/types';

export function buildJoinMetadata(
  mode: ServiceMode,
  values: {
    orderNumber?: string;
    vehicleDescription?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    driveInNote?: string;
    notes?: string;
  },
): Record<string, unknown> | undefined {
  switch (mode) {
    case 'TAKEAWAY':
      if (!values.orderNumber?.trim()) return undefined;
      return {
        orderNumber: values.orderNumber.trim(),
        ...(values.notes?.trim() ? { note: values.notes.trim() } : {}),
      };
    case 'DRIVE_IN': {
      const vehicleMake = values.vehicleDescription?.trim();
      if (!vehicleMake) return undefined;
      return {
        vehicleMake,
        ...(values.vehicleColor?.trim() ? { vehicleColor: values.vehicleColor.trim() } : {}),
        ...(values.vehiclePlate?.trim() ? { vehiclePlate: values.vehiclePlate.trim() } : {}),
        ...(values.driveInNote?.trim() ? { note: values.driveInNote.trim() } : {}),
      };
    }
    default:
      return values.notes?.trim() ? { note: values.notes.trim() } : undefined;
  }
}

export const occasionOptions = [
  'Birthday',
  'Anniversary',
  'Business',
  'Regular',
  'VIP',
] as const;

export const seatingOptions = [
  'Indoor',
  'Outdoor',
  'Non Smoking',
  'Smoking',
] as const;

export const bookingRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  phone: z
    .string()
    .min(8, 'Enter a valid mobile number')
    .max(20)
    .regex(/^[+]?[\d\s()-]+$/, 'Enter a valid mobile number'),
  partySize: z.number().int().min(1).max(20),
  email: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  notificationPreference: z.enum(['SMS', 'WHATSAPP', 'BOTH']),
  notes: z.string().max(500).optional(),
});

export type BookingRegistrationValues = z.infer<typeof bookingRegistrationSchema>;

export const joinQueueSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  phone: z
    .string()
    .min(8, 'Enter a valid mobile number')
    .max(20)
    .regex(/^[+]?[\d\s()-]+$/, 'Enter a valid mobile number'),
  partySize: z.number().int().min(1).max(20),
  notes: z.string().max(500).optional(),
  notificationPreference: z.enum(['SMS', 'WHATSAPP', 'BOTH']),
  whatsappNumber: z
    .string()
    .max(20)
    .regex(/^[+]?[\d\s()-]*$/, 'Enter a valid WhatsApp number')
    .optional()
    .or(z.literal('')),
  occasion: z.enum(occasionOptions).optional(),
  seatingPreference: z.enum(seatingOptions).optional(),
});

export type JoinQueueFormValues = z.infer<typeof joinQueueSchema>;

export function buildJoinNotes(
  values: {
    notes?: string;
    occasion?: JoinQueueFormValues['occasion'];
    seatingPreference?: JoinQueueFormValues['seatingPreference'];
    whatsappNumber?: string;
    email?: string;
    orderNumber?: string;
    vehicleDescription?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    driveInNote?: string;
  },
): string | undefined {
  const parts: string[] = [];

  if (values.orderNumber?.trim()) {
    parts.push(`Order #${values.orderNumber.trim()}`);
  }
  if (values.vehicleDescription?.trim()) {
    const vehicle = values.vehicleColor?.trim()
      ? `${values.vehicleColor.trim()} ${values.vehicleDescription.trim()}`
      : values.vehicleDescription.trim();
    parts.push(`Vehicle: ${vehicle}`);
  }
  if (values.vehiclePlate?.trim()) {
    parts.push(`Plate: ${values.vehiclePlate.trim()}`);
  }
  if (values.driveInNote?.trim()) {
    parts.push(values.driveInNote.trim());
  }
  if (values.email?.trim()) {
    parts.push(`Email: ${values.email.trim()}`);
  }
  if (values.occasion) {
    parts.push(`Occasion: ${values.occasion}`);
  }
  if (values.seatingPreference) {
    parts.push(`Seating: ${values.seatingPreference}`);
  }
  if (values.whatsappNumber?.trim()) {
    parts.push(`WhatsApp: ${values.whatsappNumber.trim()}`);
  }
  if (values.notes?.trim()) {
    parts.push(values.notes.trim());
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export const takeawayJoinSchema = joinQueueSchema.extend({
  orderNumber: z.string().min(1, 'Enter your order number').max(20),
});

export const driveInJoinSchema = joinQueueSchema.extend({
  vehicleDescription: z.string().min(2, 'Describe your vehicle').max(80),
  vehicleColor: z.string().max(40).optional(),
  vehiclePlate: z.string().max(20).optional(),
  driveInNote: z.string().max(200).optional(),
});

export type ModeJoinFormValues = JoinQueueFormValues & {
  orderNumber?: string;
  vehicleDescription?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
  driveInNote?: string;
  email?: string;
};

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
