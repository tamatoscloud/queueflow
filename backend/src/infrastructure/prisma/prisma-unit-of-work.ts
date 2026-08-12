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
    work: (repos: import('../../queue-engine/application/ports/unit-of-work').TransactionRepositories) => Promise<T>,
  ): Promise<T> {
    const sorted = [...new Set(queueIds)].sort();
    return this.prisma.$transaction(
      async (tx) => {
        const repos = createTransactionalRepositories(tx);
        for (const queueId of sorted) {
          const locked = await repos.queues.lockById(queueId);
          if (!locked) {
            throw new QueueNotFoundError(queueId);
          }
        }
        return work(repos);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }
}
