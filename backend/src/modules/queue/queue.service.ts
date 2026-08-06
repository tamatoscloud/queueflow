import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueueEngineService } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginatedMeta,
  paginationSkip,
} from '../../common/dto/pagination.dto';
import type {
  CreateQueueDto,
  ListQueueQueryDto,
  UpdateQueueDto,
} from './dto/queue.dto';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
  ) {}

  async create(dto: CreateQueueDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, businessId: dto.businessId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found for business');
    }
    const queue = await this.engine.createQueue({
      businessId: dto.businessId,
      branchId: dto.branchId,
      name: dto.name,
      description: dto.description,
      prefix: dto.prefix,
      maxCapacity: dto.maxCapacity,
      averageServiceTimeMinutes: dto.averageServiceTimeMinutes,
      priorityEnabled: dto.priorityEnabled,
      recallTimeoutSeconds: dto.recallTimeoutSeconds,
      noShowTimeoutSeconds: dto.noShowTimeoutSeconds,
    });
    return queue.toProps();
  }

  async update(id: string, dto: UpdateQueueDto) {
    await this.require(id);
    return this.prisma.queue.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        maxCapacity: dto.maxCapacity,
        averageServiceTimeMinutes: dto.averageServiceTimeMinutes,
        priorityEnabled: dto.priorityEnabled,
        isAcceptingEntries: dto.isAcceptingEntries,
        recallTimeoutSeconds: dto.recallTimeoutSeconds,
        noShowTimeoutSeconds: dto.noShowTimeoutSeconds,
      },
    });
  }

  async get(id: string) {
    return this.require(id);
  }

  async remove(id: string) {
    await this.require(id);
    return this.prisma.queue.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED', isAcceptingEntries: false },
    });
  }

  async list(query: ListQueueQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.QueueWhereInput = {
      deletedAt: null,
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status
        ? { status: query.status as Prisma.EnumQueueStatusFilter['equals'] }
        : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const [totalItems, data] = await this.prisma.$transaction([
      this.prisma.queue.count({ where }),
      this.prisma.queue.findMany({
        where,
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);
    return { data, meta: paginatedMeta(page, pageSize, totalItems) };
  }

  async open(id: string) {
    return (await this.engine.openQueue(id)).toProps();
  }

  async pause(id: string) {
    return (await this.engine.pauseQueue(id)).toProps();
  }

  async resume(id: string) {
    return (await this.engine.resumeQueue(id)).toProps();
  }

  async close(id: string) {
    return (await this.engine.closeQueue(id)).toProps();
  }

  private async require(id: string) {
    const row = await this.prisma.queue.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(`Queue ${id} not found`);
    }
    return row;
  }
}
