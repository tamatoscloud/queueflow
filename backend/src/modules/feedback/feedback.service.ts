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
      ...(businessId ? { businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
      }),
    ]);
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async get(id: string) {
    return this.tenantScope.requireFeedback(id);
  }
}
