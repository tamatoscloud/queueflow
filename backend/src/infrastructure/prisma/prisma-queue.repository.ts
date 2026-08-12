import { Injectable } from '@nestjs/common';
import type { Queue, QueueRepository } from '../../queue-engine';
import { QueueNotFoundError } from '../../queue-engine';
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

  async lockById(id: string): Promise<Queue | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; last_token_number: number; prefix: string }>
    >`
      SELECT id, last_token_number, prefix
      FROM queues
      WHERE id = ${id}::uuid
        AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!rows[0]) {
      return null;
    }
    return this.findById(id);
  }

  async incrementTokenNumber(queueId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ last_token_number: number; prefix: string }>
    >`
      UPDATE queues
      SET last_token_number = last_token_number + 1,
          updated_at = NOW()
      WHERE id = ${queueId}::uuid
        AND deleted_at IS NULL
      RETURNING last_token_number, prefix
    `;
    const row = rows[0];
    if (!row) {
      throw new QueueNotFoundError(queueId);
    }
    return { tokenNumber: row.last_token_number, prefix: row.prefix };
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
