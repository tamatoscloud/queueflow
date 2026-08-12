import type {
  CustomerRepository,
  QueueEntryRepository,
  QueueRepository,
  TokenRepository,
} from './repositories';

/** Repository bundle participating in a single queue mutation transaction. */
export interface TransactionRepositories {
  queues: QueueRepository;
  entries: QueueEntryRepository;
  customers: CustomerRepository;
  tokens: TokenRepository;
}

/**
 * Serializes multi-write queue mutations with database-backed locking (Prisma)
 * or in-memory snapshot rollback for tests.
 */
export interface UnitOfWork {
  runForQueues<T>(
    queueIds: readonly string[],
    work: (repos: TransactionRepositories) => Promise<T>,
  ): Promise<T>;
}
