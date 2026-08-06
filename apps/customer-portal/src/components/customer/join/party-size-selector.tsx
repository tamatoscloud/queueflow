'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_SIZES = [1, 2, 3, 4, 5] as const;
const MAX_PARTY = 20;

type PartySizeSelectorProps = {
  value: number;
  onChange: (size: number) => void;
  error?: string;
};

export function PartySizeSelector({ value, onChange, error }: PartySizeSelectorProps) {
  const clamp = (n: number) => Math.min(MAX_PARTY, Math.max(1, n));

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="party-size-stepper">
          How many people?
        </label>
        <p className="text-xs text-muted">Tap to select your party size</p>
      </div>

      <div className="flex gap-2">
        {QUICK_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={cn(
              'h-12 min-w-[3rem] flex-1 rounded-2xl border-2 text-base font-bold transition-all duration-200 active:scale-95',
              value === size
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-surface text-foreground hover:border-primary/30',
            )}
            aria-pressed={value === size}
          >
            {size}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(value >= 6 ? value : 6)}
          className={cn(
            'h-12 min-w-[3rem] flex-1 rounded-2xl border-2 text-base font-bold transition-all duration-200 active:scale-95',
            value >= 6
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border bg-surface text-foreground hover:border-primary/30',
          )}
          aria-pressed={value >= 6}
        >
          6+
        </button>
      </div>

      {value >= 6 ? (
        <div
          id="party-size-stepper"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-2 py-1"
        >
          <button
            type="button"
            aria-label="Decrease party size"
            onClick={() => onChange(clamp(value - 1))}
            disabled={value <= 6}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-neutral-100 disabled:opacity-30"
          >
            <Minus className="h-5 w-5" aria-hidden />
          </button>
          <span className="text-lg font-bold tabular-nums">
            {value} {value === 1 ? 'person' : 'people'}
          </span>
          <button
            type="button"
            aria-label="Increase party size"
            onClick={() => onChange(clamp(value + 1))}
            disabled={value >= MAX_PARTY}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-neutral-100 disabled:opacity-30"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
