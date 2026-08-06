const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'refresh',
  'bearer',
  'cookie',
];

export type StructuredLogFields = Record<string, unknown>;

function maskValue(key: string, value: unknown): unknown {
  if (value == null) return value;
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
    return '[REDACTED]';
  }
  if (typeof value === 'string' && value.length > 120) {
    return `${value.slice(0, 40)}…[truncated]`;
  }
  return value;
}

export function maskStructuredFields(
  fields: StructuredLogFields,
): StructuredLogFields {
  const out: StructuredLogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = maskStructuredFields(value as StructuredLogFields);
    } else {
      out[key] = maskValue(key, value);
    }
  }
  return out;
}

export function writeStructuredLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  fields: StructuredLogFields = {},
): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'queueflow-backend',
    ...maskStructuredFields(fields),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
