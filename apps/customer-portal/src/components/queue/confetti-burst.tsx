'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const COLORS = ['#e4ff2c', '#003d32', '#f1ffa6', '#0b5444', '#ffffff', '#3b6b5d'];

type ConfettiBurstProps = {
  active: boolean;
  className?: string;
};

/** CSS confetti burst — table ready celebration. */
export function ConfettiBurst({ active, className }: ConfettiBurstProps) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; delay: number; color: string; rotate: number }[]
  >([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    setPieces(
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: COLORS[i % COLORS.length]!,
        rotate: Math.random() * 360,
      })),
    );
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 z-50 overflow-hidden', className)}
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 h-2 w-2 animate-confetti-fall rounded-sm"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
