import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LightWaitingExperience } from '@/components/customer/light/light-waiting-experience';
import { LightReadyExperience } from '@/components/customer/light/light-ready-experience';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { makeTracking } from '@/testing/tracking-fixture';

describe('LightWaitingExperience', () => {
  it('renders the Quyk waiting screen with timer and actions', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ estimatedWaitMinutes: 18, customersAhead: 3, position: 4 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: /You're in the queue/i })).toBeInTheDocument();
    expect(screen.getByText('Waiting Line')).toBeInTheDocument();
    expect(screen.getByText(/Minutes estimated wait/i)).toBeInTheDocument();
    expect(screen.getByText('Browse menu')).toBeInTheDocument();
    expect(screen.getByText('Browser notifications')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Browser notifications' })).toBeInTheDocument();
    expect(screen.getByText(/mins? left|Any moment/i)).toBeInTheDocument();
    expect(screen.getByText('Auto-updating live')).toBeInTheDocument();
  });

  it('shows people ahead and token context', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({
          business: { id: 'biz-1', name: 'Bella Vista', logoUrl: null },
          position: 7,
          customersAhead: 5,
          estimatedWaitMinutes: 15,
        })}
        connection="connected"
      />,
    );

    expect(screen.getAllByText(/5 parties ahead/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/queue token w-123/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/You're #7 of/i)).toBeInTheDocument();
    expect(screen.getByText('Phone updates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit number' })).toBeInTheDocument();
  });

  it('says next in line when no one is ahead', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ customersAhead: 0, position: 1, estimatedWaitMinutes: 2 })}
        connection="connected"
      />,
    );

    expect(screen.getByText(/You're next in line/i)).toBeInTheDocument();
    expect(screen.getByText(/mins? left/i)).toBeInTheDocument();
  });
});

describe('LightReadyExperience', () => {
  it('renders the queue pass with number, party and hold timer', () => {
    render(
      <LightReadyExperience
        displayCode="W-123"
        calledAt={new Date().toISOString()}
        branchName="Bella Vista Downtown"
        businessName="Bella Vista"
        partySize={4}
        position={1}
        copy={getServiceModeCopy('DINE_IN')}
      />,
    );

    expect(screen.getByRole('heading', { name: /It's your turn/i })).toBeInTheDocument();
    expect(screen.getByText(/Your table is almost ready/i)).toBeInTheDocument();
    expect(screen.getByText(/host stand at Bella Vista Downtown/i)).toBeInTheDocument();
    expect(screen.getByText('W-123')).toBeInTheDocument();
    expect(screen.getByText('Party of 4')).toBeInTheDocument();
    expect(screen.getByText(/Hold expires in 1:5\d|Hold expires in 2:00/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Hold time remaining' })).toBeInTheDocument();
  });
});
