'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type AnimatedCounterProps = {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
};

function formatCountValue(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 10) / 10).toString();
}

/** Counts up when value changes — queue position, wait time. */
export function AnimatedCounter({
  value,
  className,
  duration = 800,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let frame: number;
    const useTenths = !Number.isInteger(to) || !Number.isInteger(from);

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(useTenths ? Math.round(next * 10) / 10 : Math.round(next));
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={cn('tabular-nums', className)} aria-live="polite">
      {prefix}
      {formatCountValue(display)}
      {suffix}
    </span>
  );
}
