'use client';

import { User, Users, Hash, Mail, Bell, Lock, Check, ChevronDown } from 'lucide-react';
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
    <LightField label="Party size" icon={Users} error={error}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-12 w-full appearance-none rounded-full border border-neutral-200 bg-white px-5 pr-10 text-base text-neutral-900 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          aria-label="Party size"
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {String(n).padStart(2, '0')}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
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
