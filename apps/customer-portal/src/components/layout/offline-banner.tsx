'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 p-3">
      <Alert variant="info">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" aria-hidden />
          <span>You&apos;re offline. We&apos;ll refresh when you reconnect.</span>
        </div>
      </Alert>
    </div>
  );
}
