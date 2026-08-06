import { Injectable } from '@nestjs/common';
import type { Queue, QueueRepository } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDomainQueue, toPrismaQueueData } from './mappers/queue-engine.mapper';

@Injectable()
export class PrismaQueueRepository implements QueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Queue | null> {
    const row = await this.prisma.queue.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toDomainQueue(row) : null;
  }

  async save(queue: Queue): Promise<void> {
    const data = toPrismaQueueData(queue);
    await this.prisma.queue.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        description: data.description,
        status: data.status,
        prefix: data.prefix,
        maxCapacity: data.maxCapacity,
        averageServiceTimeMinutes: data.averageServiceTimeMinutes,
        isAcceptingEntries: data.isAcceptingEntries,
        autoCallNext: data.autoCallNext,
        priorityEnabled: data.priorityEnabled,
        recallTimeoutSeconds: data.recallTimeoutSeconds,
        noShowTimeoutSeconds: data.noShowTimeoutSeconds,
        notifyBeforeTurns: data.notifyBeforeTurns,
        lastTokenNumber: data.lastTokenNumber,
        lastTokenResetAt: data.lastTokenResetAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
    });
  }
}
