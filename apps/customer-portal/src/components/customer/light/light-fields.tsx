'use client';

import { forwardRef } from 'react';
import { Check, Minus, Plus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { QuykFieldLabel, QuykInput } from '@/components/quyk/ui';

export function LightField({
  label,
  icon,
  htmlFor,
  error,
  children,
}: {
  label: string;
  icon: LucideIcon;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <QuykFieldLabel icon={icon} htmlFor={htmlFor}>
        {label}
      </QuykFieldLabel>
      {children}
      {error ? (
        <p className="text-[13px] text-[#9a3412]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const LightInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function LightInput(props, ref) {
    return <QuykInput ref={ref} {...props} />;
  },
);

export function LightVenueField({ venueName }: { venueName: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[14px] font-semibold text-q-ink">Venue</p>
      <div className="flex h-[52px] items-center justify-between rounded-[14px] border border-q-field bg-q-cream px-4">
        <span className="text-[16px] font-medium text-q-ink">{venueName}</span>
        <Check className="h-5 w-5 text-q-green" aria-hidden />
      </div>
    </div>
  );
}

/** Figma "How many people?" card: grey minus, big count, lime plus. */
export function LightPartySelect({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (n: number) => void;
  error?: string;
}) {
  return (
    <div className="rounded-[22px] border border-q-line bg-white px-4 pb-4 pt-3.5">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-q-ink">
        <Users className="h-4 w-4 text-q-green" aria-hidden />
        How many people?
      </p>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Decrease party size"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e3eadb] text-q-green transition-opacity disabled:opacity-40"
        >
          <Minus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
        <span
          className="min-w-[3rem] text-center text-[34px] font-bold leading-none tabular-nums text-q-green"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Increase party size"
          disabled={value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-q-lime text-q-green transition-opacity disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-[13px] text-[#9a3412]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type LightRegister = UseFormRegister<{
  fullName: string;
  phone: string;
  email?: string;
  orderNumber?: string;
  vehicleDescription?: string;
}>;

export type LightFormErrors = FieldErrors<{
  fullName: string;
  phone: string;
  email?: string;
  orderNumber?: string;
  vehicleDescription?: string;
}>;
