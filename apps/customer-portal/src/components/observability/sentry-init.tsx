'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/observability/sentry';

export function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);
  return null;
}
