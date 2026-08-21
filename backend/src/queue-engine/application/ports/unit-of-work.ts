import type { Queue } from '../../domain/entities/queue.entity';
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
 *
 * `lockedQueues` contains the rows already locked for this mutation — callers
 * should prefer these over a redundant findById round-trip.
 */
export interface UnitOfWork {
  runForQueues<T>(
    queueIds: readonly string[],
    work: (
      repos: TransactionRepositories,
      lockedQueues: ReadonlyMap<string, Queue>,
    ) => Promise<T>,
  ): Promise<T>;
}
