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
}
