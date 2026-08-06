import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  corsOriginDelegate,
  isAllowedCorsOrigin,
  parseCorsOriginsFromEnv,
} from './cors.util';

describe('cors.util', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.APP_ENV = 'development';
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3001,https://app.example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows any localhost origin in development', () => {
    expect(isAllowedCorsOrigin('http://localhost:51234')).toBe(true);
    expect(isAllowedCorsOrigin('http://127.0.0.1:8080')).toBe(true);
  });

  it('allows configured origins in development', () => {
    expect(isAllowedCorsOrigin('https://app.example.com')).toBe(true);
  });

  it('allows private LAN origins in development (phone testing)', () => {
    expect(isAllowedCorsOrigin('http://192.168.0.248:3001')).toBe(true);
    expect(isAllowedCorsOrigin('http://10.0.0.5:8080')).toBe(true);
  });

  it('blocks unknown origins in development', () => {
    expect(isAllowedCorsOrigin('https://evil.example.com')).toBe(false);
  });

  it('corsOriginDelegate permits localhost', () => {
    let allowed = false;
    corsOriginDelegate('http://localhost:9999', (err, ok) => {
      expect(err).toBeNull();
      allowed = ok === true;
    });
    expect(allowed).toBe(true);
  });

  it('parses csv origins from env', () => {
    expect(parseCorsOriginsFromEnv()).toEqual([
      'http://localhost:3001',
      'https://app.example.com',
    ]);
  });
});
