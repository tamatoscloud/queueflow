'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ServiceMode } from '@/lib/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/customer/primitives';
import { Info } from 'lucide-react';
import type { ModeJoinFormValues } from '@/lib/schemas/forms';

type ModeJoinFieldsProps = {
  mode: ServiceMode;
  register: UseFormRegister<ModeJoinFormValues>;
  errors: FieldErrors<ModeJoinFormValues>;
};

export function ModeJoinFields({ mode, register, errors }: ModeJoinFieldsProps) {
  if (mode === 'TAKEAWAY') {
    return (
      <div className="space-y-4">
        <GlassCard className="flex items-start gap-3 border-warning/30 bg-warning-light/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-sm text-muted">
            Your order number helps the restaurant match your visit with your order.
          </p>
        </GlassCard>
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order number</Label>
          <Input
            id="orderNumber"
            placeholder="e.g. 4821"
            inputMode="numeric"
            {...register('orderNumber')}
          />
          {errors.orderNumber ? (
            <p className="text-sm text-danger" role="alert">
              {errors.orderNumber.message}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (mode === 'DRIVE_IN') {
    return (
      <div className="space-y-4">
        <GlassCard className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-muted">
            Tell us about your vehicle so staff can find you in the pickup lane.
          </p>
        </GlassCard>
        <div className="space-y-2">
          <Label htmlFor="vehicleDescription">Vehicle</Label>
          <Input
            id="vehicleDescription"
            placeholder="e.g. Black Toyota"
            {...register('vehicleDescription')}
          />
          {errors.vehicleDescription ? (
            <p className="text-sm text-danger" role="alert">
              {errors.vehicleDescription.message}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="vehicleColor">Color</Label>
            <Input id="vehicleColor" placeholder="Black" {...register('vehicleColor')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehiclePlate">Plate (optional)</Label>
            <Input id="vehiclePlate" placeholder="ABC-123" {...register('vehiclePlate')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="driveInNote">Special note (optional)</Label>
          <Input id="driveInNote" placeholder="Allergies, pickup instructions…" {...register('driveInNote')} />
        </div>
      </div>
    );
  }

  return null;
}
