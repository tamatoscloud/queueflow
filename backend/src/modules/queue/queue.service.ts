import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueueEngineService } from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import { RealtimeCredentialService } from '../../infrastructure/realtime/services/realtime-credential.service';
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
    private readonly tenantScope: TenantScopeService,
    private readonly realtimeCredentials: RealtimeCredentialService,
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
  ) {}

  async create(dto: CreateQueueDto) {
    const businessId = this.tenantScope.resolveRequiredBusinessId(dto.businessId);
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, businessId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found for business');
    }
    const queue = await this.engine.createQueue({
      businessId,
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
    const props = queue.toProps();
    if (dto.serviceMode) {
      await this.prisma.queue.update({
        where: { id: props.id },
        data: { serviceMode: dto.serviceMode },
      });
      return { ...props, serviceMode: dto.serviceMode };
    }
    return props;
  }

  async update(id: string, dto: UpdateQueueDto) {
    await this.tenantScope.requireQueue(id);
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
        serviceMode: dto.serviceMode,
      },
    });
  }

  async get(id: string) {
    return this.tenantScope.requireQueue(id);
  }

  async remove(id: string) {
    await this.tenantScope.requireQueue(id);
    return this.prisma.queue.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED', isAcceptingEntries: false },
    });
  }

  async list(query: ListQueueQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const businessId = this.tenantScope.resolveOptionalListBusinessId(
      query.businessId,
    );
    const where: Prisma.QueueWhereInput = {
      deletedAt: null,
      ...(businessId ? { businessId } : {}),
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
    // One round-trip for rows + waiting counts (filtered relation _count),
    // parallel with total count — avoids a follow-up groupBy under high RTT.
    const [totalItems, data] = await Promise.all([
      this.prisma.queue.count({ where }),
      this.prisma.queue.findMany({
        where,
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              entries: {
                where: { deletedAt: null, status: 'WAITING' },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: data.map(({ _count, ...q }) => ({
        ...q,
        waitingCount: _count.entries,
      })),
      meta: paginatedMeta(page, pageSize, totalItems),
    };
  }

  async open(id: string) {
    await this.tenantScope.requireQueue(id);
    return (await this.engine.openQueue(id)).toProps();
  }

  async pause(id: string) {
    await this.tenantScope.requireQueue(id);
    return (await this.engine.pauseQueue(id)).toProps();
  }

  async resume(id: string) {
    await this.tenantScope.requireQueue(id);
    return (await this.engine.resumeQueue(id)).toProps();
  }

  async close(id: string) {
    await this.tenantScope.requireQueue(id);
    return (await this.engine.closeQueue(id)).toProps();
  }

  async issueDisplayCredential(queueId: string) {
    await this.tenantScope.requireQueue(queueId);
    return {
      queueId,
      displayToken: this.realtimeCredentials.issueQueueDisplayToken(queueId),
    };
  }
}
