export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export function successEnvelope<T>(
  data: T,
  requestId: string,
  meta?: Record<string, unknown>,
): ApiSuccessEnvelope<T> {
  return meta
    ? { success: true, data, meta, requestId }
    : { success: true, data, requestId };
}

export function errorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ApiErrorEnvelope {
  return {
    success: false,
    error: details !== undefined ? { code, message, details } : { code, message },
    requestId,
  };
}
