import { randomUUID } from 'crypto';
import type { Queue } from '../entities/queue.entity';
import { TokenDisplayCode } from '../value-objects';

export interface IssuedToken {
  id: string;
  queueId: string;
  tokenNumber: number;
  displayCode: string;
  issuedDate: Date;
}

/**
 * Issues the next display token for a queue (mutates queue.lastTokenNumber).
 * Separated from join orchestration so unit tests can assert token format
 * without going through the full join path.
 */
export class TokenFactory {
  static issue(queue: Queue, now: Date): IssuedToken {
    const tokenNumber = queue.issueNextTokenNumber(now);
    const code = TokenDisplayCode.fromPrefix(queue.prefix, tokenNumber);
    const issuedDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return {
      id: randomUUID(),
      queueId: queue.id,
      tokenNumber: code.tokenNumber,
      displayCode: code.value,
      issuedDate,
    };
  }
}
