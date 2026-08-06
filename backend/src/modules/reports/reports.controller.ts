import { Controller, Get, Inject, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { ApiStandardOkResponse } from '../../common/swagger/api-responses.decorator';
import { ReportsService } from './reports.service';
import { DailySummaryQueryDto } from './dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions(Permission.REPORTS_VIEW)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @Get('queues/:queueId/metrics')
  @ApiOperation({
    summary: 'Queue metrics report',
    description:
      'Live metrics: waiting count, called count, average service time, throughput.',
  })
  @ApiStandardOkResponse('Queue metrics')
  metrics(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.reports.metrics(queueId);
  }

  @Get('queues/:queueId/snapshot')
  @ApiOperation({
    summary: 'Live queue snapshot',
    description: 'Current waiting and called entries with positions and ETAs.',
  })
  @ApiStandardOkResponse('Queue snapshot')
  snapshot(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.reports.snapshot(queueId);
  }

  @Get('queues/:queueId/daily-summary')
  @ApiOperation({
    summary: 'Daily summary for a queue',
    description:
      'Aggregated join/completion/cancellation counts and wait-time stats for one queue on a given day.',
  })
  @ApiStandardOkResponse('Daily queue summary')
  queueDailySummary(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Query() query: Omit<DailySummaryQueryDto, 'queueId'>,
  ) {
    return this.reports.dailySummary({ ...query, queueId });
  }

  @Get('daily-summary')
  @ApiOperation({
    summary: 'Daily summary for a business',
    description:
      'Aggregated queue activity across all queues (or filter by queueId) for a given day.',
  })
  @ApiStandardOkResponse('Daily business summary')
  dailySummary(@Query() query: DailySummaryQueryDto) {
    return this.reports.dailySummary(query);
  }

  @Get('queue-entries/:entryId/wait-time')
  @ApiOperation({
    summary: 'Estimated wait time for an entry',
    description: 'Returns the engine-calculated ETA for a specific queue entry.',
  })
  @ApiStandardOkResponse('Estimated wait time')
  waitTime(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.reports.waitTime(entryId);
  }
}
