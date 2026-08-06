import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { QueueEngineService } from '../../queue-engine';
import type { DailySummaryQueryDto } from './dto/reports.dto';
import { ReportsRepository } from './reports.repository';
import { toDailySummaryResponse } from './reports.mapper';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly repository: ReportsRepository,
  ) {}

  metrics(queueId: string) {
    return this.engine.calculateQueueMetrics(queueId);
  }

  waitTime(entryId: string) {
    return this.engine.estimateWaitTime(entryId);
  }

  snapshot(queueId: string) {
    return this.engine.getLiveQueueSnapshot(queueId);
  }

  async dailySummary(query: DailySummaryQueryDto) {
    const dateLabel = query.date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const start = new Date(`${dateLabel}T00:00:00.000Z`);
    const end = new Date(`${dateLabel}T23:59:59.999Z`);
    const filters = {
      businessId: query.businessId,
      queueId: query.queueId,
      start,
      end,
      dateLabel,
    };
    const agg = await this.repository.aggregateDailySummary(filters);
    return toDailySummaryResponse(filters, agg);
  }
}
