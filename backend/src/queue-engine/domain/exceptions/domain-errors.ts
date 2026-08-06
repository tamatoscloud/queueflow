/**
 * Domain exceptions — typed errors the Queue Engine throws.
 * Application/API layers map these to HTTP/gRPC codes later.
 */

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class QueueNotFoundError extends DomainError {
  constructor(queueId: string) {
    super('QUEUE_NOT_FOUND', `Queue ${queueId} was not found`);
  }
}

export class QueueEntryNotFoundError extends DomainError {
  constructor(entryId: string) {
    super('QUEUE_ENTRY_NOT_FOUND', `Queue entry ${entryId} was not found`);
  }
}

export class InvalidQueueStateError extends DomainError {
  constructor(message: string) {
    super('INVALID_QUEUE_STATE', message);
  }
}

export class InvalidEntryTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'INVALID_ENTRY_TRANSITION',
      `Cannot transition queue entry from ${from} to ${to}`,
    );
  }
}

export class QueueCapacityExceededError extends DomainError {
  constructor(queueId: string, capacity: number) {
    super(
      'QUEUE_CAPACITY_EXCEEDED',
      `Queue ${queueId} is at capacity (${capacity})`,
    );
  }
}

export class DuplicateActiveJoinError extends DomainError {
  readonly entryId: string;

  constructor(phone: string, entryId: string) {
    super(
      'DUPLICATE_ACTIVE_JOIN',
      `Phone ${phone} already has an active entry in this queue`,
    );
    this.entryId = entryId;
  }
}

export class QueueNotAcceptingEntriesError extends DomainError {
  constructor(queueId: string) {
    super(
      'QUEUE_NOT_ACCEPTING',
      `Queue ${queueId} is not accepting new entries`,
    );
  }
}

export class OutsideOperatingHoursError extends DomainError {
  constructor(branchId: string) {
    super(
      'OUTSIDE_OPERATING_HOURS',
      `Branch ${branchId} is outside operating hours`,
    );
  }
}

export class QueueEmptyError extends DomainError {
  constructor(queueId: string) {
    super('QUEUE_EMPTY', `No waiting customers in queue ${queueId}`);
  }
}

export class RecallTimeoutNotElapsedError extends DomainError {
  constructor(entryId: string, remainingSeconds: number) {
    super(
      'RECALL_TIMEOUT_NOT_ELAPSED',
      `Entry ${entryId} cannot be recalled yet (${remainingSeconds}s remaining)`,
    );
  }
}

export class NoShowTimeoutNotElapsedError extends DomainError {
  constructor(entryId: string, remainingSeconds: number) {
    super(
      'NO_SHOW_TIMEOUT_NOT_ELAPSED',
      `Entry ${entryId} cannot be marked no-show yet (${remainingSeconds}s remaining)`,
    );
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class CrossTenantTransferError extends DomainError {
  constructor() {
    super(
      'CROSS_TENANT_TRANSFER',
      'Cannot transfer a queue entry to a queue in a different business',
    );
  }
}
