'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { ConfettiBurst } from '@/components/queue/confetti-burst';

type WelcomeBannerProps = {
  displayCode: string;
  onDismiss?: () => void;
};

export function WelcomeBanner({ displayCode, onDismiss }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <>
      <ConfettiBurst active />
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 animate-fade-in-up">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="font-bold text-foreground">You&apos;re on the list!</p>
          <p className="text-sm text-muted">
            Token <span className="font-mono font-semibold text-foreground">{displayCode}</span> — live
            updates below.
          </p>
        </div>
      </div>
    </>
  );
}
