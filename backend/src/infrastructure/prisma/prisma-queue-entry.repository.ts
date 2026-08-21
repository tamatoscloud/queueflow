import { Injectable } from '@nestjs/common';
import type {
  QueueEntry,
  QueueEntryRepository,
  QueueEntryStatus,
} from '../../queue-engine';
import { QueueEntryNotFoundError } from '../../queue-engine';
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

  async lockById(id: string): Promise<QueueEntry | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM queue_entries
      WHERE id = ${id}::uuid
        AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!rows[0]) {
      return null;
    }
    return this.findById(id);
  }

  async claimNextWaiting(
    queueId: string,
    priorityEnabled: boolean,
    actorUserId: string | null,
    now: Date,
  ): Promise<QueueEntry | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT qe.id
      FROM queue_entries qe
      WHERE qe.queue_id = ${queueId}::uuid
        AND qe.deleted_at IS NULL
        AND qe.status = 'WAITING'
      ORDER BY
        CASE WHEN ${priorityEnabled} THEN CASE WHEN qe.is_vip THEN 0 ELSE 1 END END ASC NULLS LAST,
        CASE WHEN ${priorityEnabled} THEN qe.priority END DESC NULLS LAST,
        qe.sort_order ASC,
        qe.joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    const row = rows[0];
    if (!row) {
      return null;
    }
    const entry = await this.findById(row.id);
    if (!entry) {
      throw new QueueEntryNotFoundError(row.id);
    }
    entry.call(actorUserId, now);
    await this.save(entry);
    return entry;
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
      try {
        await this.prisma.queueEntry.update({
          where: { id: p.id },
          data: update,
        });
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: unknown }).code)
            : '';
        if (code !== 'P2025') {
          throw err;
        }
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
