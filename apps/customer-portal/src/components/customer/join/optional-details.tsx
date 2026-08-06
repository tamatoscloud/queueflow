'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import type { BookingRegistrationValues } from '@/lib/schemas/forms';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const NOTE_CHIPS = ['Birthday', 'High chair', 'Accessibility', 'Special request'] as const;

type OptionalDetailsProps = {
  register: UseFormRegister<BookingRegistrationValues>;
  notes: string;
  onNotesChange: (value: string) => void;
  emailError?: string;
};

export function OptionalDetails({ register, notes, onNotesChange, emailError }: OptionalDetailsProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const toggleChip = (chip: string) => {
    const parts = notes
      .split(' · ')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.includes(chip)) {
      onNotesChange(parts.filter((p) => p !== chip).join(' · '));
    } else {
      onNotesChange(parts.length ? `${parts.join(' · ')} · ${chip}` : chip);
    }
  };

  return (
    <div className="space-y-2">
      {!showEmail ? (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add email (optional)
        </button>
      ) : (
        <div className="animate-fade-in-up space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email (optional)
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 rounded-2xl bg-surface"
            {...register('email')}
          />
          {emailError ? (
            <p className="text-sm text-danger" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
      )}

      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a note
        </button>
      ) : (
        <div className="animate-fade-in-up space-y-3">
          <p className="text-sm font-medium text-foreground">Add a note</p>
          <div className="flex flex-wrap gap-2">
            {NOTE_CHIPS.map((chip) => {
              const active = notes.split(' · ').includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted hover:border-primary/30',
                  )}
                  aria-pressed={active}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <Textarea
            placeholder="Anything else we should know?"
            className="min-h-[80px] rounded-2xl bg-surface"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
