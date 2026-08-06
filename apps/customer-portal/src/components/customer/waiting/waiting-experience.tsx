'use client';

import { useCallback, useMemo, useState } from 'react';
import type { EntryTracking } from '@/lib/api/types';
import type { RealtimeConnectionState } from '@/lib/realtime/socket-events';
import { resolveJourneyStep } from '@/lib/waiting/wait-helpers';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { TokenDisplay } from '@/components/queue/token-display';
import { RealtimeIndicator } from '@/components/customer/waiting/realtime-indicator';
import { QueueWalletPass } from '@/components/customer/waiting/queue-wallet-pass';
import { QueuePositionHero } from '@/components/customer/waiting/queue-position-hero';
import { QueuePositionLadder } from '@/components/customer/waiting/queue-position-ladder';
import { WaitProgress } from '@/components/customer/waiting/wait-progress';
import { QueueJourneyTimeline } from '@/components/customer/waiting/queue-journey-timeline';
import { SmartWaitMessage } from '@/components/customer/waiting/smart-wait-message';
import { RestaurantInfoPanel } from '@/components/customer/waiting/restaurant-info-panel';
import { WhileYouWait } from '@/components/customer/waiting/while-you-wait';
import { NotificationStatus } from '@/components/customer/waiting/notification-status';
import { NeedHelp } from '@/components/customer/waiting/need-help';
import { AlmostYourTurn } from '@/components/customer/waiting/almost-your-turn';
import { WelcomeOverlay } from '@/components/customer/waiting/welcome-overlay';
import { cn } from '@/lib/utils';

type WaitingExperienceProps = {
  tracking: EntryTracking;
  connection: RealtimeConnectionState;
  showWelcome?: boolean;
  onWelcomeDismiss?: () => void;
  className?: string;
};

export function WaitingExperience({
  tracking,
  connection,
  showWelcome = false,
  onWelcomeDismiss,
  className,
}: WaitingExperienceProps) {
  const [welcomeVisible, setWelcomeVisible] = useState(showWelcome);
  const [baseline] = useState(() => ({
    customersAhead: tracking.customersAhead,
    estimatedWaitMinutes: tracking.estimatedWaitMinutes,
  }));

  const handleWelcomeDismiss = useCallback(() => {
    setWelcomeVisible(false);
    onWelcomeDismiss?.();
  }, [onWelcomeDismiss]);

  const { entry, business, branch, position, customersAhead, estimatedWaitMinutes } = tracking;
  const copy = useMemo(
    () => getServiceModeCopy(tracking.queue.serviceMode),
    [tracking.queue.serviceMode],
  );
  const journeyStep = resolveJourneyStep(entry.status, customersAhead);
  const isAlmostUp = entry.status === 'WAITING' && customersAhead <= 2;

  return (
    <div className={cn('flex flex-col gap-5 pb-8', className)}>
      {welcomeVisible ? (
        <WelcomeOverlay displayCode={entry.displayCode} copy={copy} onDismiss={handleWelcomeDismiss} />
      ) : null}

      <header className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{business.name}</h1>
          <RealtimeIndicator connection={connection} />
        </div>
        <p className="text-sm text-muted">{copy.queueLabel}</p>
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{copy.tokenLabel}</p>
          <TokenDisplay code={entry.displayCode} variant="code-only" className="text-5xl" />
        </div>
      </header>

      <QueuePositionHero
        customersAhead={customersAhead}
        estimatedWaitMinutes={estimatedWaitMinutes}
        copy={copy}
      />

      {isAlmostUp ? (
        <AlmostYourTurn
          customersAhead={customersAhead}
          estimatedWaitMinutes={estimatedWaitMinutes}
          copy={copy}
        />
      ) : (
        <SmartWaitMessage
          status={entry.status}
          customersAhead={customersAhead}
          mode={tracking.queue.serviceMode}
        />
      )}

      <QueueWalletPass
        restaurantName={business.name}
        displayCode={entry.displayCode}
        partySize={entry.partySize}
        customersAhead={customersAhead}
        estimatedWaitMinutes={estimatedWaitMinutes}
        connection={connection}
        copy={copy}
        serviceMode={tracking.queue.serviceMode}
      />

      <QueuePositionLadder
        position={position}
        customersAhead={customersAhead}
        copy={copy}
      />

      <WaitProgress
        initialCustomersAhead={baseline.customersAhead}
        currentCustomersAhead={customersAhead}
        initialWaitMinutes={baseline.estimatedWaitMinutes}
        currentWaitMinutes={estimatedWaitMinutes}
      />

      <QueueJourneyTimeline currentStep={journeyStep} copy={copy} />

      <WhileYouWait title={copy.whileYouWaitTitle} />

      <NotificationStatus copy={copy} />

      <RestaurantInfoPanel businessName={business.name} branchName={branch.name} />

      <NeedHelp displayCode={entry.displayCode} copy={copy} />

      <p className="text-center text-[10px] text-muted" role="status">
        {connection === 'connected'
          ? 'Live'
          : connection === 'connecting' || connection === 'reconnecting'
            ? 'Reconnecting…'
            : 'Updating…'}
        {' · '}
        {branch.name}
      </p>
    </div>
  );
}
