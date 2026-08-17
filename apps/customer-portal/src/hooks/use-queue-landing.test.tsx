import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQueueLanding } from '@/hooks/use-queue-landing';
import { customerApi } from '@/lib/api/customer-api';
import { queueRealtime } from '@/lib/realtime/queue-realtime';

vi.mock('@/lib/api/customer-api', () => ({
  customerApi: {
    getQueueLanding: vi.fn(),
  },
}));

vi.mock('@/lib/realtime/queue-realtime', () => ({
  queueRealtime: {
    subscribeQueueLanding: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.mocked(customerApi.getQueueLanding).mockReset();
  vi.mocked(queueRealtime.subscribeQueueLanding).mockReset();
  vi.mocked(queueRealtime.subscribeQueueLanding).mockReturnValue({
    unsubscribe: vi.fn(),
  });
});

describe('useQueueLanding', () => {
  it('does not request the API for non-UUID queue ids', async () => {
    renderHook(() => useQueueLanding('demo'), { wrapper });

    await waitFor(() => {
      expect(customerApi.getQueueLanding).not.toHaveBeenCalled();
      expect(queueRealtime.subscribeQueueLanding).not.toHaveBeenCalled();
    });
  });

  it('fetches landing data for a UUID queue id', async () => {
    vi.mocked(customerApi.getQueueLanding).mockResolvedValue({} as never);

    renderHook(() => useQueueLanding('11111111-1111-1111-1111-111111111111'), {
      wrapper,
    });

    await waitFor(() => {
      expect(customerApi.getQueueLanding).toHaveBeenCalledTimes(1);
      expect(queueRealtime.subscribeQueueLanding).toHaveBeenCalledTimes(1);
    });
  });
});
