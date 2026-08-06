import { createHash, randomBytes } from 'node:crypto';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function generateDeviceId(): string {
  return randomBytes(16).toString('hex');
}
