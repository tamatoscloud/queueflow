import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LightWaitingExperience } from '@/components/customer/light/light-waiting-experience';
import { LightReadyExperience } from '@/components/customer/light/light-ready-experience';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { makeTracking } from '@/testing/tracking-fixture';

describe('LightWaitingExperience', () => {
  it('renders queue waiting state with timer and venue details', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ estimatedWaitMinutes: 18, customersAhead: 3, position: 4 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: /You are in the Queue/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Black Stone Café' })).toBeInTheDocument();
    expect(screen.getByText('Browse Menu')).toBeInTheDocument();
    expect(screen.getByText('Browser Notifications')).toBeInTheDocument();
    expect(screen.getByText(/min left|Any moment/i)).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { level: 2, name: 'Bella Vista' })).toBeInTheDocument();
    expect(screen.getAllByText(/5 parties ahead/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/queue token w-123/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/You are #7 of/i)).toBeInTheDocument();
    expect(screen.getByText('Phone updates')).toBeInTheDocument();
  });

  it('still shows the waiting hero when few customers ahead', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ customersAhead: 2, estimatedWaitMinutes: 8 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: /You are in the Queue/i })).toBeInTheDocument();
    expect(screen.getByText(/notify you when your turn approaches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2 parties ahead/i).length).toBeGreaterThan(0);
  });
});

describe('LightReadyExperience', () => {
  it('renders called state with countdown and hold message', () => {
    render(
      <LightReadyExperience
        displayCode="W-123"
        calledAt={new Date().toISOString()}
        branchName="Bahadurabad, Karachi"
        businessName="Black Stone Café"
        partySize={2}
        position={1}
        copy={getServiceModeCopy('DINE_IN')}
      />,
    );

    expect(screen.getByRole('heading', { name: /It's your turn/i })).toBeInTheDocument();
    expect(screen.getByText(/Please come now/i)).toBeInTheDocument();
    expect(screen.getByText('W-123')).toBeInTheDocument();
  });
});
