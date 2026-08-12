import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { QueueEngineService } from '../../queue-engine';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import type { DailySummaryQueryDto } from './dto/reports.dto';
import { ReportsRepository } from './reports.repository';
import { toDailySummaryResponse } from './reports.mapper';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly repository: ReportsRepository,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async metrics(queueId: string) {
    await this.tenantScope.requireQueue(queueId);
    return this.engine.calculateQueueMetrics(queueId);
  }

  async waitTime(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.estimateWaitTime(entryId);
  }

  async snapshot(queueId: string) {
    await this.tenantScope.requireQueue(queueId);
    return this.engine.getLiveQueueSnapshot(queueId);
  }

  async dailySummary(query: DailySummaryQueryDto) {
    const dateLabel = query.date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const businessId = this.tenantScope.resolveRequiredBusinessId(
      query.businessId,
    );
    if (query.queueId) {
      const queue = await this.tenantScope.requireQueue(query.queueId);
      if (queue.businessId !== businessId) {
        throw new ForbiddenException('TENANT_ACCESS_DENIED');
      }
    }
    const start = new Date(`${dateLabel}T00:00:00.000Z`);
    const end = new Date(`${dateLabel}T23:59:59.999Z`);
    const filters = {
      businessId,
      queueId: query.queueId,
      start,
      end,
      dateLabel,
    };
    const agg = await this.repository.aggregateDailySummary(filters);
    return toDailySummaryResponse(filters, agg);
  }
}
