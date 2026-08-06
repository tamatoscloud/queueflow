import { ValidationError } from '../exceptions/domain-errors';

/** E.164-ish phone: digits with optional leading +. Normalized storage form. */
export class PhoneNumber {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): PhoneNumber {
    const trimmed = raw.trim().replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(trimmed)) {
      throw new ValidationError(`Invalid phone number: ${raw}`);
    }
    return new PhoneNumber(trimmed);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }
}

export class PartySize {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number, max = 50): PartySize {
    if (!Number.isInteger(value) || value < 1 || value > max) {
      throw new ValidationError(
        `Party size must be an integer between 1 and ${max}`,
      );
    }
    return new PartySize(value);
  }
}

/** Fractional position key for reorder without renumbering the whole queue. */
export class SortOrder {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static of(value: number): SortOrder {
    if (!Number.isFinite(value)) {
      throw new ValidationError('sortOrder must be a finite number');
    }
    return new SortOrder(value);
  }

  /** Midpoint between two neighbors; falls back to before+1 when after is null. */
  static between(before: number | null, after: number | null): SortOrder {
    if (before === null && after === null) {
      return SortOrder.of(1);
    }
    if (before === null && after !== null) {
      return SortOrder.of(after - 1);
    }
    if (before !== null && after === null) {
      return SortOrder.of(before + 1);
    }
    return SortOrder.of((before! + after!) / 2);
  }
}

export class TokenDisplayCode {
  readonly value: string;
  readonly tokenNumber: number;

  private constructor(value: string, tokenNumber: number) {
    this.value = value;
    this.tokenNumber = tokenNumber;
  }

  static fromPrefix(prefix: string, tokenNumber: number): TokenDisplayCode {
    if (!prefix || prefix.length > 4) {
      throw new ValidationError('Queue token prefix must be 1–4 characters');
    }
    if (!Number.isInteger(tokenNumber) || tokenNumber < 1) {
      throw new ValidationError('tokenNumber must be a positive integer');
    }
    const padded = String(tokenNumber).padStart(3, '0');
    return new TokenDisplayCode(`${prefix}-${padded}`, tokenNumber);
  }
}

export interface WaitEstimate {
  readonly position: number;
  readonly customersAhead: number;
  readonly estimatedWaitMinutes: number;
  readonly averageServiceTimeMinutes: number;
}

export interface QueueMetrics {
  readonly waitingCount: number;
  readonly calledCount: number;
  readonly holdingCount: number;
  readonly completedCount: number;
  readonly cancelledCount: number;
  readonly noShowCount: number;
  readonly skippedCount: number;
  readonly averageWaitMinutes: number | null;
  readonly averageServiceTimeMinutes: number;
  readonly capacity: number | null;
  readonly occupancy: number;
}
