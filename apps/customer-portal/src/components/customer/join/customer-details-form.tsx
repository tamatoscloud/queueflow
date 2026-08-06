'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ServiceMode } from '@/lib/api/types';
import type { BookingRegistrationValues } from '@/lib/schemas/forms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CustomerDetailsFormProps = {
  mode?: ServiceMode;
  register: UseFormRegister<BookingRegistrationValues>;
  errors: FieldErrors<BookingRegistrationValues>;
};

function nameHint(mode: ServiceMode | undefined): string {
  switch (mode) {
    case 'TAKEAWAY':
      return "We'll use this when your order is ready for pickup.";
    case 'DRIVE_IN':
      return "We'll use this when we bring your order to your car.";
    default:
      return "We'll use this when calling your party.";
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function CustomerDetailsForm({ mode, register, errors }: CustomerDetailsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName" className="text-sm font-semibold">
          Your name
        </Label>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="e.g. John"
          className="mt-1.5 h-12 rounded-2xl bg-surface text-base"
          {...register('fullName')}
        />
        <p className="mt-1 text-xs text-muted">{nameHint(mode)}</p>
        <FieldError message={errors.fullName?.message} />
      </div>

      <div>
        <Label htmlFor="phone" className="text-sm font-semibold">
          Mobile number
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="03XX XXXXXXX"
          className="mt-1.5 h-12 rounded-2xl bg-surface text-base"
          {...register('phone')}
        />
        <p className="mt-1 text-xs text-muted">We&apos;ll send your queue updates here.</p>
        <FieldError message={errors.phone?.message} />
      </div>
    </div>
  );
}
