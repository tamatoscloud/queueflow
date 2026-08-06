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
