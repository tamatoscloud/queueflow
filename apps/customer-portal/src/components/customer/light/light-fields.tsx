'use client';

import { User, Users, Hash, Mail, Bell, Lock, Check } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { cn } from '@/lib/utils';

export function LightField({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        <span>{label}</span>
      </div>
      {children}
      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LightInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-full border border-neutral-200 bg-white px-5 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20',
        className,
      )}
      {...props}
    />
  );
}

export function LightVenueField({ venueName }: { venueName: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700">Venue</p>
      <div className="flex h-12 items-center justify-between rounded-full border border-neutral-200 bg-neutral-50 px-5">
        <span className="text-base font-medium text-neutral-900">{venueName}</span>
        <Check className="h-5 w-5 text-neutral-900" aria-hidden />
      </div>
    </div>
  );
}

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
    <LightField label="How many people?" icon={Users} error={error}>
      <div className="flex items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
        <button
          type="button"
          aria-label="Decrease party size"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-2xl font-bold text-foreground disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center font-display text-4xl font-bold tabular-nums text-foreground">
          {value}
        </span>
        <button
          type="button"
          aria-label="Increase party size"
          disabled={value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-[var(--on-primary)] disabled:opacity-40"
        >
          +
        </button>
      </div>
    </LightField>
  );
}

export function LightFormIcons() {
  return { User, Users, Hash, Mail, Bell, Lock };
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
