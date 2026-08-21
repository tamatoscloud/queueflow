import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UnitOfWork } from '../../queue-engine/application/ports/unit-of-work';
import { QueueNotFoundError } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createTransactionalRepositories } from './transactional-queue-repositories';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async runForQueues<T>(
    queueIds: readonly string[],
    work: (
      repos: import('../../queue-engine/application/ports/unit-of-work').TransactionRepositories,
      lockedQueues: ReadonlyMap<string, import('../../queue-engine').Queue>,
    ) => Promise<T>,
  ): Promise<T> {
    const sorted = [...new Set(queueIds)].sort();
    return this.prisma.$transaction(
      async (tx) => {
        const repos = createTransactionalRepositories(tx);
        const lockedQueues = new Map<string, import('../../queue-engine').Queue>();
        for (const queueId of sorted) {
          const locked = await repos.queues.lockById(queueId);
          if (!locked) {
            throw new QueueNotFoundError(queueId);
          }
          lockedQueues.set(queueId, locked);
        }
        return work(repos, lockedQueues);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  }
}
