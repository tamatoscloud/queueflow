import type { UnitOfWork, TransactionRepositories } from '../../application/ports/unit-of-work';
import type {
  InMemoryCustomerRepository,
  InMemoryQueueEntryRepository,
  InMemoryQueueRepository,
  InMemoryTokenRepository,
} from './repositories';
import { QueueLockRegistry } from './queue-lock-registry';

export class InMemoryUnitOfWork implements UnitOfWork {
  private readonly locks = new QueueLockRegistry();

  constructor(
    private readonly queues: InMemoryQueueRepository,
    private readonly entries: InMemoryQueueEntryRepository,
    private readonly customers: InMemoryCustomerRepository,
    private readonly tokens: InMemoryTokenRepository,
  ) {}

  async runForQueues<T>(
    queueIds: readonly string[],
    work: (
      repos: TransactionRepositories,
      lockedQueues: ReadonlyMap<string, import('../../domain/entities/queue.entity').Queue>,
    ) => Promise<T>,
  ): Promise<T> {
    return this.locks.runExclusive(queueIds, async () => {
      const snapshot = {
        queues: this.queues.snapshot(),
        entries: this.entries.snapshot(),
        customers: this.customers.snapshot(),
        tokens: this.tokens.snapshot(),
      };
      const repos: TransactionRepositories = {
        queues: this.queues,
        entries: this.entries,
        customers: this.customers,
        tokens: this.tokens,
      };
      const lockedQueues = new Map<string, import('../../domain/entities/queue.entity').Queue>();
      for (const queueId of [...new Set(queueIds)].sort()) {
        const locked = await this.queues.lockById(queueId);
        if (locked) {
          lockedQueues.set(queueId, locked);
        }
      }
      try {
        return await work(repos, lockedQueues);
      } catch (err) {
        this.queues.restore(snapshot.queues);
        this.entries.restore(snapshot.entries);
        this.customers.restore(snapshot.customers);
        this.tokens.restore(snapshot.tokens);
        throw err;
      }
    });
  }
}
