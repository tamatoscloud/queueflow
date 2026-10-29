'use client';

import { useEffect, useRef, useState } from 'react';
import {
  clampEstimatedWaitMinutes,
  formatCountdownClock,
  MIN_ESTIMATED_WAIT_MINUTES,
} from '@/lib/waiting/wait-estimate';
import { loadQueueSession, saveQueueSession } from '@/lib/storage/session';

export type WaitCountdown = {
  remainingSeconds: number;
  clock: string;
  finished: boolean;
};

/**
 * Live wait countdown for the track screen.
 * Prefers the join-time deadline in session so the clock starts immediately
 * and keeps ticking across refreshes; re-anchors when the server estimate changes.
 */
export function useWaitCountdown(
  entryId: string,
  estimatedWaitMinutes: number,
  enabled = true,
): WaitCountdown {
  const clamped = clampEstimatedWaitMinutes(estimatedWaitMinutes);

  const resolveDeadline = (estimateMinutes: number): number => {
    const session = loadQueueSession();
    const estimateMs = Math.round(estimateMinutes * 60_000);

    if (
      session?.entryId === entryId &&
      typeof session.waitDeadlineAt === 'number' &&
      session.waitEstimateMinutes === estimateMinutes
    ) {
      return session.waitDeadlineAt;
    }

    const deadline = Date.now() + estimateMs;
    if (session?.entryId === entryId) {
      saveQueueSession({
        ...session,
        waitDeadlineAt: deadline,
        waitEstimateMinutes: estimateMinutes,
      });
    }
    return deadline;
  };

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((resolveDeadline(clamped) - Date.now()) / 1000)),
  );
  const deadlineRef = useRef<number>(resolveDeadline(clamped));
  const lastEstimateRef = useRef(clamped);

  useEffect(() => {
    if (!enabled) return;

    if (lastEstimateRef.current !== clamped) {
      lastEstimateRef.current = clamped;
      deadlineRef.current = resolveDeadline(clamped);
    }

    const tick = () => {
      // Still waiting after the estimate ran out: never show 0:00 — roll
      // forward by the minimum wait (2.5 min) until the guest is called.
      if (deadlineRef.current - Date.now() <= 0) {
        deadlineRef.current = Date.now() + MIN_ESTIMATED_WAIT_MINUTES * 60_000;
      }
      const left = Math.max(
        1,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setRemainingSeconds(left);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // resolveDeadline reads session; re-run when estimate/entry changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, enabled, entryId]);

  return {
    remainingSeconds,
    clock: formatCountdownClock(remainingSeconds),
    finished: remainingSeconds <= 0,
  };
}
