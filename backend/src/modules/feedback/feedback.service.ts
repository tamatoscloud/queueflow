import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import {
  paginatedMeta,
  paginationSkip,
} from '../../common/dto/pagination.dto';
import type { ListFeedbackQueryDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async list(query: ListFeedbackQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const businessId = this.tenantScope.resolveOptionalListBusinessId(
      query.businessId,
    );
    const where: Prisma.FeedbackWhereInput = {
      deletedAt: null,
      // Staff/business UIs care about submitted reviews, not empty REQUESTED rows.
      status: 'SUBMITTED',
      rating: query.rating != null ? query.rating : { not: null },
      ...(businessId ? { businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };
    const [totalItems, rows] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          branch: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
          queueEntry: {
            select: {
              id: true,
              queueToken: { select: { displayCode: true } },
            },
          },
        },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { submittedAt: query.sortOrder ?? 'desc' },
      }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      businessId: row.businessId,
      branchId: row.branchId,
      customerId: row.customerId,
      queueEntryId: row.queueEntryId,
      status: row.status,
      rating: row.rating,
      comment: row.comment,
      requestedAt: row.requestedAt,
      submittedAt: row.submittedAt,
      createdAt: row.createdAt,
      customerName: row.customer.fullName,
      customerPhone: row.customer.phone,
      branchName: row.branch.name,
      businessName: row.business.name,
      displayCode: row.queueEntry.queueToken?.displayCode ?? null,
    }));

    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async get(id: string) {
    const row = await this.tenantScope.requireFeedback(id);
    const full = await this.prisma.feedback.findFirst({
      where: { id: row.id, deletedAt: null },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        branch: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
        queueEntry: {
          select: {
            id: true,
            queueToken: { select: { displayCode: true } },
          },
        },
      },
    });
    if (!full) return row;
    return {
      id: full.id,
      businessId: full.businessId,
      branchId: full.branchId,
      customerId: full.customerId,
      queueEntryId: full.queueEntryId,
      status: full.status,
      rating: full.rating,
      comment: full.comment,
      requestedAt: full.requestedAt,
      submittedAt: full.submittedAt,
      createdAt: full.createdAt,
      customerName: full.customer.fullName,
      customerPhone: full.customer.phone,
      branchName: full.branch.name,
      businessName: full.business.name,
      displayCode: full.queueEntry.queueToken?.displayCode ?? null,
    };
  }
}
