import { Injectable } from '@nestjs/common';
import type {
  QueueEntry,
  QueueEntryRepository,
  QueueEntryStatus,
} from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ACTIVE_PRISMA_STATUSES,
  toDomainQueueEntry,
  toPrismaQueueEntryUpdate,
} from './mappers/queue-engine.mapper';

const entryInclude = {
  queueToken: true,
  customer: { select: { phone: true, fullName: true } },
} as const;

@Injectable()
export class PrismaQueueEntryRepository implements QueueEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<QueueEntry | null> {
    const row = await this.prisma.queueEntry.findFirst({
      where: { id, deletedAt: null },
      include: entryInclude,
    });
    return row ? toDomainQueueEntry(row) : null;
  }

  async findByQueueId(queueId: string): Promise<QueueEntry[]> {
    const rows = await this.prisma.queueEntry.findMany({
      where: { queueId, deletedAt: null },
      include: entryInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toDomainQueueEntry);
  }

  async findActiveByQueueId(queueId: string): Promise<QueueEntry[]> {
    const rows = await this.prisma.queueEntry.findMany({
      where: {
        queueId,
        deletedAt: null,
        status: { in: ACTIVE_PRISMA_STATUSES },
      },
      include: entryInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toDomainQueueEntry);
  }

  async findActivePhones(
    queueId: string,
  ): Promise<Array<{ entryId: string; phone: string; status: QueueEntryStatus }>> {
    const rows = await this.prisma.queueEntry.findMany({
      where: {
        queueId,
        deletedAt: null,
        status: { in: ACTIVE_PRISMA_STATUSES },
      },
      select: {
        id: true,
        status: true,
        customer: { select: { phone: true } },
      },
    });
    return rows.map((r) => ({
      entryId: r.id,
      phone: r.customer.phone,
      status: r.status as QueueEntryStatus,
    }));
  }

  async countActive(queueId: string): Promise<number> {
    return this.prisma.queueEntry.count({
      where: {
        queueId,
        deletedAt: null,
        status: { in: ACTIVE_PRISMA_STATUSES },
      },
    });
  }

  async save(entry: QueueEntry): Promise<void> {
    await this.saveMany([entry]);
  }

  async saveMany(entries: readonly QueueEntry[]): Promise<void> {
    for (const entry of entries) {
      const p = entry.toProps();
      const update = toPrismaQueueEntryUpdate(entry);
      const existing = await this.prisma.queueEntry.findUnique({
        where: { id: p.id },
      });
      if (existing) {
        await this.prisma.queueEntry.update({
          where: { id: p.id },
          data: update,
        });
      } else {
        await this.prisma.queueEntry.create({
          data: {
            id: p.id,
            ...update,
            createdAt: p.createdAt,
          },
        });
      }
    }
  }
}
