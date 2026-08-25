import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginationSkip,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import type {
  CreateBusinessDto,
  ListBusinessQueryDto,
  UpdateBusinessDto,
} from './dto/business.dto';

@Injectable()
export class BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        timezone: data.timezone ?? 'UTC',
        settings: { create: {} },
      },
    });
  }

  update(id: string, data: UpdateBusinessDto) {
    return this.prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        timezone: data.timezone,
        status: data.status,
        logoUrl: data.logoUrl,
      },
    });
  }

  findById(id: string) {
    return this.prisma.business.findFirst({
      where: { id, deletedAt: null },
      include: { settings: true },
    });
  }

  async upsertGuestMenu(businessId: string, guestMenu: Prisma.InputJsonValue) {
    await this.prisma.businessSettings.upsert({
      where: { businessId },
      create: { businessId, guestMenu },
      update: { guestMenu },
    });
  }

  async findMany(
    query: ListBusinessQueryDto & PaginationQueryDto,
  ): Promise<{ rows: Prisma.BusinessGetPayload<object>[]; totalItems: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const [totalItems, rows] = await this.prisma.$transaction([
      this.prisma.business.count({ where }),
      this.prisma.business.findMany({
        where,
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);
    return { rows, totalItems };
  }
}
