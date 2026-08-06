/**
 * CORS policy shared by REST (NestJS) and Socket.IO gateway.
 *
 * In development, any localhost / 127.0.0.1 origin is allowed so Flutter Web
 * (random port), customer portal (:3001), and Vite (:5173) work without editing
 * env on every run. Production uses the explicit CORS_ALLOWED_ORIGINS list.
 */

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PRIVATE_LAN_ORIGIN =
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function isDevelopment(): boolean {
  const env = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
  return env === 'development' || env === 'dev' || env === 'local';
}

export function parseCorsOriginsFromEnv(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (isDevelopment() && (LOCALHOST_ORIGIN.test(origin) || PRIVATE_LAN_ORIGIN.test(origin))) {
    return true;
  }
  return parseCorsOriginsFromEnv().includes(origin);
}

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

/** NestJS `enableCors({ origin })` — function form for dynamic dev origins. */
export function corsOriginDelegate(
  origin: string | undefined,
  callback: CorsOriginCallback,
): void {
  if (isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked origin: ${origin ?? '(none)'}`), false);
}

/** Socket.IO gateway `cors.origin` — array in prod, permissive localhost/LAN regex in dev. */
export function socketCorsOrigins(): string[] | RegExp {
  if (isDevelopment()) {
    return /https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
  }
  return parseCorsOriginsFromEnv();
}
