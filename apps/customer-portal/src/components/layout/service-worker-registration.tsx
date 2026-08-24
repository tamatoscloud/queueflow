'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal
      });
    };

    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idle.requestIdleCallback === 'function') {
      const id = idle.requestIdleCallback(register, { timeout: 4000 });
      return () => idle.cancelIdleCallback?.(id);
    }

    const t = window.setTimeout(register, 2500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
