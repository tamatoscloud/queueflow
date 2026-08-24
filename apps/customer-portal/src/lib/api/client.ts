import type { ApiError, ApiSuccess } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const DEFAULT_TIMEOUT_MS = 10_000;

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
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _timeoutMs, signal, ...fetchInit } = init ?? {};
  void _timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchInit,
      signal: signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...fetchInit.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('Request timed out — try again', 'TIMEOUT', 0);
    }
    throw new ApiClientError('Network error — check your connection', 'NETWORK_ERROR', 0);
  } finally {
    clearTimeout(timer);
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
