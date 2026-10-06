import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ACTIVE_PRISMA_STATUSES } from '../../infrastructure/prisma/mappers/queue-engine.mapper';
import { paginationSkip } from '../../common/dto/pagination.dto';
import type { CustomerHistoryQueryDto } from './dto/customer.dto';
import { parseGuestSearchQuery, queueTokenSearchWhere } from './guest-search';

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

  /** Flexible match: exact phone, phone suffix, name contains, or ticket number/code. */
  async findByBusinessQuery(businessId: string, rawQuery: string) {
    const parsed = parseGuestSearchQuery(rawQuery);
    if (!parsed.text) return null;

    const tokenWhere = queueTokenSearchWhere(rawQuery);
    if (tokenWhere) {
      const byToken = await this.prisma.queueEntry.findFirst({
        where: {
          deletedAt: null,
          queue: { businessId },
          queueToken: tokenWhere,
        },
        include: { customer: true },
        orderBy: { joinedAt: 'desc' },
      });
      if (byToken?.customer && !byToken.customer.deletedAt) {
        return byToken.customer;
      }
    }

    const or: Prisma.CustomerWhereInput[] = [
      { fullName: { contains: parsed.text, mode: 'insensitive' } },
    ];
    if (parsed.digits.length >= 4) {
      or.push({ phone: { contains: parsed.digits } });
      or.push({ phone: { endsWith: parsed.digits.slice(-10) } });
      if (parsed.text.startsWith('+') || parsed.digits.length >= 8) {
        or.push({ phone: parsed.text.replace(/\s/g, '') });
        or.push({ phone: `+${parsed.digits}` });
        or.push({ phone: parsed.digits });
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
    const parsed = parseGuestSearchQuery(q ?? '');
    const tokenWhere = q?.trim() ? queueTokenSearchWhere(q) : null;

    const searchOr: Prisma.CustomerWhereInput[] = parsed.text
      ? [
          { fullName: { contains: parsed.text, mode: 'insensitive' } },
          ...(parsed.digits.length >= 3
            ? [{ phone: { contains: parsed.digits } }]
            : []),
          ...(tokenWhere
            ? [
                {
                  queueEntries: {
                    some: {
                      deletedAt: null,
                      queueToken: tokenWhere,
                    },
                  },
                },
              ]
            : []),
        ]
      : [];

    const customerFilter: Prisma.CustomerWhereInput = {
      businessId,
      deletedAt: null,
      ...(searchOr.length ? { OR: searchOr } : {}),
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
