import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Cost factor for new hashes. Existing hashes keep their embedded cost;
 * bcrypt.compare still verifies them. Default 10 balances security vs
 * small Railway CPUs (was 12 — ~4× slower verifies).
 */
const ROUNDS = Math.min(
  15,
  Math.max(8, Number(process.env.BCRYPT_ROUNDS ?? 10) || 10),
);

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** True when the stored hash uses a higher cost than the current target. */
  needsRehash(hash: string): boolean {
    const match = /^\$2[aby]?\$(\d{2})\$/.exec(hash);
    if (!match) return false;
    const cost = Number(match[1]);
    return Number.isFinite(cost) && cost > ROUNDS;
  }
}
