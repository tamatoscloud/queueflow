import { Prisma, type PrismaClient } from '@prisma/client';
import type { Queue, QueueRepository } from '../../queue-engine';
import type {
  Customer,
  CustomerRepository,
  QueueEntry,
  QueueEntryRepository,
  TokenRepository,
  IncrementedTokenCounter,
} from '../../queue-engine';
import type { IssuedToken } from '../../queue-engine/domain/factories/token-factory';
import { QueueNotFoundError, QueueEntryNotFoundError } from '../../queue-engine';
import {
  ACTIVE_PRISMA_STATUSES,
  toDomainCustomer,
  toDomainQueue,
  toDomainQueueEntry,
  toPrismaCustomerData,
  toPrismaQueueData,
  toPrismaQueueEntryUpdate,
} from './mappers/queue-engine.mapper';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const entryInclude = {
  queueToken: true,
  customer: { select: { phone: true, fullName: true } },
} as const;

export class TransactionalPrismaQueueRepository implements QueueRepository {
  constructor(private readonly tx: PrismaTx) {}

  async findById(id: string): Promise<Queue | null> {
    const row = await this.tx.queue.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toDomainQueue(row) : null;
  }

  async lockById(id: string): Promise<Queue | null> {
    const rows = await this.tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
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

  async incrementTokenNumber(queueId: string): Promise<IncrementedTokenCounter> {
    const rows = await this.tx.$queryRaw<
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
    await this.tx.queue.upsert({
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

export class TransactionalPrismaQueueEntryRepository implements QueueEntryRepository {
  constructor(private readonly tx: PrismaTx) {}

  async findById(id: string): Promise<QueueEntry | null> {
    const row = await this.tx.queueEntry.findFirst({
      where: { id, deletedAt: null },
      include: entryInclude,
    });
    return row ? toDomainQueueEntry(row) : null;
  }

  async lockById(id: string): Promise<QueueEntry | null> {
    const rows = await this.tx.$queryRaw<Array<{ id: string }>>`
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

  async findByQueueId(queueId: string): Promise<QueueEntry[]> {
    const rows = await this.tx.queueEntry.findMany({
      where: { queueId, deletedAt: null },
      include: entryInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toDomainQueueEntry);
  }

  async findActiveByQueueId(queueId: string): Promise<QueueEntry[]> {
    const rows = await this.tx.queueEntry.findMany({
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
  ): Promise<Array<{ entryId: string; phone: string; status: QueueEntry['status'] }>> {
    const rows = await this.tx.queueEntry.findMany({
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
      status: r.status as QueueEntry['status'],
    }));
  }

  async countActive(queueId: string): Promise<number> {
    return this.tx.queueEntry.count({
      where: {
        queueId,
        deletedAt: null,
        status: { in: ACTIVE_PRISMA_STATUSES },
      },
    });
  }

  async claimNextWaiting(
    queueId: string,
    priorityEnabled: boolean,
    actorUserId: string | null,
    now: Date,
  ): Promise<QueueEntry | null> {
    const rows = await this.tx.$queryRaw<Array<{ id: string }>>`
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

  async save(entry: QueueEntry): Promise<void> {
    await this.saveMany([entry]);
  }

  async saveMany(entries: readonly QueueEntry[]): Promise<void> {
    for (const entry of entries) {
      const p = entry.toProps();
      const update = toPrismaQueueEntryUpdate(entry);
      try {
        await this.tx.queueEntry.update({
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
        await this.tx.queueEntry.create({
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

export class TransactionalPrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly tx: PrismaTx) {}

  async findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<Customer | null> {
    const row = await this.tx.customer.findFirst({
      where: { businessId, phone, deletedAt: null },
    });
    return row ? toDomainCustomer(row) : null;
  }

  async save(customer: Customer): Promise<void> {
    const data = toPrismaCustomerData(customer);
    await this.tx.customer.upsert({
      where: { id: data.id },
      create: data,
      update: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        totalVisits: data.totalVisits,
        lastVisitAt: data.lastVisitAt,
        isBlacklisted: data.isBlacklisted,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
    });
  }
}

export class TransactionalPrismaTokenRepository implements TokenRepository {
  constructor(private readonly tx: PrismaTx) {}

  async save(token: IssuedToken): Promise<void> {
    await this.tx.queueToken.create({
      data: {
        id: token.id,
        queueId: token.queueId,
        tokenNumber: token.tokenNumber,
        displayCode: token.displayCode,
        issuedDate: token.issuedDate,
        status: 'ISSUED',
      },
    });
  }
}

export function createTransactionalRepositories(tx: PrismaTx) {
  return {
    queues: new TransactionalPrismaQueueRepository(tx),
    entries: new TransactionalPrismaQueueEntryRepository(tx),
    customers: new TransactionalPrismaCustomerRepository(tx),
    tokens: new TransactionalPrismaTokenRepository(tx),
  };
}
