'use client';

import { Check } from 'lucide-react';
import type { NotificationPreference } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: NotificationPreference; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'BOTH', label: 'WhatsApp + SMS' },
];

type NotificationPreferenceChipsProps = {
  value: NotificationPreference;
  onChange: (pref: NotificationPreference) => void;
};

export function NotificationPreferenceChips({ value, onChange }: NotificationPreferenceChipsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">How should we notify you?</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-foreground hover:border-primary/30',
              )}
              aria-pressed={selected}
            >
              {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
