import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaitingExperience } from '@/components/customer/waiting/waiting-experience';
import { TableReadyExperience } from '@/components/customer/waiting/table-ready-experience';
import { QueueEnded } from '@/components/customer/queue-ended';
import { QueuePositionHero } from '@/components/customer/waiting/queue-position-hero';
import { RealtimeIndicator } from '@/components/customer/waiting/realtime-indicator';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { makeTracking } from '@/testing/tracking-fixture';

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

describe('WaitingExperience', () => {
  it('renders waiting state with parties ahead and estimated wait', () => {
    render(
      <WaitingExperience
        tracking={makeTracking({ customersAhead: 5, estimatedWaitMinutes: 18 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Black Stone Café' })).toBeInTheDocument();
    expect(screen.getByText('PARTIES AHEAD')).toBeInTheDocument();
    expect(screen.getByText('EST. MIN')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Queue token W-123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
  });

  it('shows almost-your-turn messaging when close', () => {
    render(
      <WaitingExperience
        tracking={makeTracking({ customersAhead: 1, estimatedWaitMinutes: 4 })}
        connection="connected"
      />,
    );

    expect(screen.getAllByText('Almost your turn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 party ahead').length).toBeGreaterThan(0);
  });

});

describe('QueuePositionHero', () => {
  it('renders updated parties ahead from realtime snapshot', () => {
    render(
      <QueuePositionHero
        customersAhead={3}
        estimatedWaitMinutes={12}
        copy={getServiceModeCopy('DINE_IN')}
      />,
    );
    expect(screen.getByLabelText('Queue status summary')).toHaveTextContent('3');
    expect(screen.getByLabelText('Queue status summary')).toHaveTextContent('12');
  });
});

describe('WaitingExperience welcome', () => {
  it('shows welcome overlay when requested', () => {
    render(
      <WaitingExperience
        tracking={makeTracking()}
        connection="connected"
        showWelcome
        onWelcomeDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByText("You're on the list!")).toBeInTheDocument();
  });
});

describe('RealtimeIndicator', () => {
  it('shows reconnecting state', () => {
    render(<RealtimeIndicator connection="reconnecting" />);
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
  });

  it('shows updating state when disconnected', () => {
    render(<RealtimeIndicator connection="disconnected" />);
    expect(screen.getByText('Updating…')).toBeInTheDocument();
  });
});

describe('TableReadyExperience', () => {
  it('renders table ready celebration', () => {
    render(
      <TableReadyExperience
        displayCode="W-123"
        calledAt={new Date().toISOString()}
        branchName="Reception"
        copy={getServiceModeCopy('DINE_IN')}
      />,
    );

    expect(screen.getByText('Your table is ready!')).toBeInTheDocument();
    expect(screen.getByText('remaining')).toBeInTheDocument();
    expect(screen.getByText('Your table will be held for 5 minutes.')).toBeInTheDocument();
  });
});

describe('QueueEnded', () => {
  it('renders cancelled state with rejoin', () => {
    render(<QueueEnded variant="cancelled" queueId="queue-1" />);
    expect(screen.getByText('Your spot was cancelled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join again/i })).toHaveAttribute(
      'href',
      '/q/queue-1',
    );
  });

  it('renders expired state', () => {
    render(<QueueEnded variant="expired" queueId="queue-1" />);
    expect(screen.getByText('Your session expired')).toBeInTheDocument();
  });
});
