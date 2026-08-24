import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ACTIVE_PRISMA_STATUSES } from '../../infrastructure/prisma/mappers/queue-engine.mapper';
import { paginationSkip } from '../../common/dto/pagination.dto';
import type { CustomerHistoryQueryDto } from './dto/customer.dto';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdAndBusiness(id: string, businessId: string) {
    return this.prisma.customer.findFirst({
      where: { id, businessId, deletedAt: null },
    });
  }

  findByBusinessAndPhone(businessId: string, phone: string) {
    return this.prisma.customer.findFirst({
      where: { businessId, phone, deletedAt: null },
    });
  }

  /** Flexible match: exact phone, phone suffix, name contains, or ticket display code. */
  async findByBusinessQuery(businessId: string, rawQuery: string) {
    const q = rawQuery.trim();
    if (!q) return null;

    const digits = q.replace(/\D/g, '');
    const byToken = await this.prisma.queueEntry.findFirst({
      where: {
        deletedAt: null,
        queue: { businessId },
        queueToken: { displayCode: { equals: q, mode: 'insensitive' } },
      },
      include: { customer: true },
      orderBy: { joinedAt: 'desc' },
    });
    if (byToken?.customer && !byToken.customer.deletedAt) {
      return byToken.customer;
    }

    const or: Prisma.CustomerWhereInput[] = [
      { fullName: { contains: q, mode: 'insensitive' } },
    ];
    if (digits.length >= 4) {
      or.push({ phone: { contains: digits } });
      or.push({ phone: { endsWith: digits.slice(-10) } });
      if (q.startsWith('+') || digits.length >= 8) {
        or.push({ phone: q.replace(/\s/g, '') });
        or.push({ phone: `+${digits}` });
        or.push({ phone: digits });
      }
    }

    return this.prisma.customer.findFirst({
      where: { businessId, deletedAt: null, OR: or },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listForBusiness(params: {
    businessId: string;
    q?: string;
    activeOnly: boolean;
    page: number;
    pageSize: number;
  }) {
    const { businessId, q, activeOnly, page, pageSize } = params;
    const digits = q?.replace(/\D/g, '') ?? '';
    const text = q?.trim() ?? '';

    const customerFilter: Prisma.CustomerWhereInput = {
      businessId,
      deletedAt: null,
      ...(text
        ? {
            OR: [
              { fullName: { contains: text, mode: 'insensitive' } },
              ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
              {
                queueEntries: {
                  some: {
                    deletedAt: null,
                    queueToken: {
                      displayCode: { contains: text, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(activeOnly
        ? {
            queueEntries: {
              some: {
                deletedAt: null,
                status: { in: ACTIVE_PRISMA_STATUSES },
              },
            },
          }
        : {}),
    };

    const [totalItems, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where: customerFilter }),
      this.prisma.customer.findMany({
        where: customerFilter,
        include: {
          queueEntries: {
            where: {
              deletedAt: null,
              ...(activeOnly
                ? { status: { in: ACTIVE_PRISMA_STATUSES } }
                : {}),
            },
            include: { queue: true, queueToken: true },
            orderBy: { joinedAt: 'desc' },
            take: 3,
          },
          _count: { select: { queueEntries: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);

    return { customers, totalItems, page, pageSize };
  }

  findActiveEntries(customerId: string) {
    return this.prisma.queueEntry.findMany({
      where: {
        customerId,
        deletedAt: null,
        status: { in: ACTIVE_PRISMA_STATUSES },
      },
      include: { queue: true, queueToken: true },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findHistory(customerId: string, query: CustomerHistoryQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.QueueEntryWhereInput = {
      customerId,
      deletedAt: null,
    };
    const [totalItems, entries] = await this.prisma.$transaction([
      this.prisma.queueEntry.count({ where }),
      this.prisma.queueEntry.findMany({
        where,
        include: { queue: true, queueToken: true },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { joinedAt: query.sortOrder ?? 'desc' },
      }),
    ]);
    return { entries, totalItems, page, pageSize };
  }
}
