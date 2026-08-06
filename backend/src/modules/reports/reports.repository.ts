import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface DailySummaryFilters {
  businessId: string;
  queueId?: string;
  start: Date;
  end: Date;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateDailySummary(filters: DailySummaryFilters) {
    const baseWhere: Prisma.QueueEntryWhereInput = {
      businessId: filters.businessId,
      deletedAt: null,
      joinedAt: { gte: filters.start, lte: filters.end },
      ...(filters.queueId ? { queueId: filters.queueId } : {}),
    };

    const [
      totalJoined,
      completed,
      cancelled,
      noShows,
      stillWaiting,
      avgWaitAgg,
      bySource,
    ] = await Promise.all([
      this.prisma.queueEntry.count({ where: baseWhere }),
      this.prisma.queueEntry.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
      this.prisma.queueEntry.count({
        where: { ...baseWhere, status: 'CANCELLED' },
      }),
      this.prisma.queueEntry.count({
        where: { ...baseWhere, status: 'NO_SHOW' },
      }),
      this.prisma.queueEntry.count({
        where: {
          ...baseWhere,
          status: { in: ['WAITING', 'CALLED', 'HOLDING', 'SKIPPED'] },
        },
      }),
      this.prisma.queueEntry.aggregate({
        where: { ...baseWhere, status: 'COMPLETED', actualWaitMinutes: { not: null } },
        _avg: { actualWaitMinutes: true },
        _max: { actualWaitMinutes: true },
        _min: { actualWaitMinutes: true },
      }),
      this.prisma.queueEntry.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      totalJoined,
      completed,
      cancelled,
      noShows,
      stillWaiting,
      averageActualWaitMinutes: avgWaitAgg._avg.actualWaitMinutes ?? null,
      minActualWaitMinutes: avgWaitAgg._min.actualWaitMinutes ?? null,
      maxActualWaitMinutes: avgWaitAgg._max.actualWaitMinutes ?? null,
      bySource: bySource.map((row) => ({
        source: row.source,
        count: row._count._all,
      })),
    };
  }
}
