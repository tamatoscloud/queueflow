import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginationSkip } from '../../common/dto/pagination.dto';
import type {
  CreateBranchDto,
  ListBranchQueryDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBusiness(id: string) {
    return this.prisma.business.findFirst({
      where: { id, deletedAt: null },
    });
  }

  create(data: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        country: data.country,
        timezone: data.timezone,
        phone: data.phone,
        email: data.email,
        settings: { create: {} },
      },
    });
  }

  update(id: string, data: UpdateBranchDto) {
    return this.prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        country: data.country,
        timezone: data.timezone,
        phone: data.phone,
        email: data.email,
        status: data.status,
      },
    });
  }

  findById(id: string) {
    return this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: { settings: true },
    });
  }

  softDelete(id: string) {
    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  async findMany(query: ListBranchQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.BranchWhereInput = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    // Independent reads run in parallel: a batched $transaction costs
    // BEGIN + each query + COMMIT as sequential DB round trips.
    const [totalItems, rows] = await Promise.all([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);
    return { rows, totalItems, page, pageSize };
  }
}
