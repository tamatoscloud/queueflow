import { describe, expect, it } from 'vitest';
import { ApiClientError } from '@/lib/api/client';
import {
  queueLandingErrorView,
  trackingPageErrorView,
} from '@/lib/errors/friendly-messages';

describe('queueLandingErrorView', () => {
  it('does not offer retry for non-UUID queue ids', () => {
    const view = queueLandingErrorView('demo', undefined);
    expect(view.title).toBe('Invalid queue link');
    expect(view.retry).toBe(false);
  });

  it('shows queue not found for 404', () => {
    const view = queueLandingErrorView(
      '11111111-1111-1111-1111-111111111111',
      new ApiClientError('missing', 'NOT_FOUND', 404),
    );
    expect(view.title).toBe('Queue not found');
    expect(view.retry).toBe(false);
  });

  it('shows service is busy for network failures', () => {
    const view = queueLandingErrorView(
      '11111111-1111-1111-1111-111111111111',
      new ApiClientError('Network error — check your connection', 'NETWORK_ERROR', 0),
    );
    expect(view.title).toBe('Service is busy');
    expect(view.retry).toBe(true);
  });

  it('shows service is busy for backend 5xx', () => {
    const view = queueLandingErrorView(
      '11111111-1111-1111-1111-111111111111',
      new ApiClientError('boom', 'INTERNAL', 503),
    );
    expect(view.title).toBe('Service is busy');
    expect(view.retry).toBe(true);
  });

  it('shows still loading for timeouts', () => {
    const view = queueLandingErrorView(
      '11111111-1111-1111-1111-111111111111',
      new ApiClientError('Request timed out — try again', 'TIMEOUT', 0),
    );
    expect(view.title).toBe('Still loading');
    expect(view.retry).toBe(true);
  });
});

describe('trackingPageErrorView', () => {
  it('rejects invalid entry ids without retry', () => {
    const view = trackingPageErrorView('not-a-uuid', undefined);
    expect(view.title).toBe('Invalid tracking link');
    expect(view.retry).toBe(false);
  });
});
