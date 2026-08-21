import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LightWaitingExperience } from '@/components/customer/light/light-waiting-experience';
import { LightReadyExperience } from '@/components/customer/light/light-ready-experience';
import { getServiceModeCopy } from '@/lib/restaurant/service-mode-config';
import { makeTracking } from '@/testing/tracking-fixture';

describe('LightWaitingExperience', () => {
  it('renders queue waiting state with wait estimate and ahead count', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ estimatedWaitMinutes: 18, customersAhead: 3, position: 4 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: /You're in the queue/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Black Stone Café' })).toBeInTheDocument();
    expect(screen.getAllByText('3 parties ahead').length).toBeGreaterThan(0);
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('does not show restaurant demo menu copy for any business name', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({
          business: { id: 'biz-1', name: 'Bella Vista', logoUrl: null },
        })}
        connection="connected"
      />,
    );

    expect(screen.queryByText('Browse menu')).not.toBeInTheDocument();
    expect(screen.getByText('W-123')).toBeInTheDocument();
  });

  it('shows almost your turn when few customers ahead', () => {
    render(
      <LightWaitingExperience
        tracking={makeTracking({ customersAhead: 2, estimatedWaitMinutes: 8 })}
        connection="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: /Almost your turn/i })).toBeInTheDocument();
    expect(screen.getByText('Please stay nearby.')).toBeInTheDocument();
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
