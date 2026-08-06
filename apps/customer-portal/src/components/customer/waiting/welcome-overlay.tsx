'use client';

import { useEffect, useState } from 'react';
import { TokenDisplay } from '@/components/queue/token-display';
import type { ServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { cn } from '@/lib/utils';

export function WelcomeOverlay({
  displayCode,
  copy,
  onDismiss,
  className,
}: {
  displayCode: string;
  copy: ServiceModeCopy;
  onDismiss: () => void;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in-up',
        className,
      )}
      role="dialog"
      aria-label="Welcome"
      aria-live="polite"
    >
      <div className="mx-6 max-w-sm text-center">
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-4 text-2xl font-bold text-foreground">{copy.welcomeTitle}</h2>
        <div className="mt-6">
          <TokenDisplay code={displayCode} variant="code-only" className="text-5xl" />
        </div>
        <p className="mt-6 text-sm text-muted">{copy.welcomeSubtitle}</p>
      </div>
    </div>
  );
}
