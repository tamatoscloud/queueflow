import type { ApiError, ApiSuccess } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError('Network error — check your connection', 'NETWORK_ERROR', 0);
  }

  const body = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || !body.success) {
    const err = body as ApiError;
    throw new ApiClientError(
      err.error?.message ?? 'Request failed',
      err.error?.code ?? 'UNKNOWN',
      response.status,
      err.error?.details,
    );
  }

  return (body as ApiSuccess<T>).data;
}
