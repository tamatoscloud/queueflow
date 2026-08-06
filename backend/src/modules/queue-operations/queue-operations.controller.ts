import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { QueueOperationsService } from './queue-operations.service';
import {
  JoinQueueDto,
  MarkNoShowDto,
  MoveCustomerDto,
  PromotePriorityDto,
  TransferCustomerDto,
  WalkInCustomerDto,
} from './dto/queue-operations.dto';

const STAFF = Permission.QUEUE_OPERATE;
const REPORTS = Permission.REPORTS_VIEW;

@ApiTags('queue-operations')
@Controller({ version: '1' })
export class QueueOperationsController {
  constructor(
    @Inject(QueueOperationsService) private readonly ops: QueueOperationsService,
  ) {}

  @Public()
  @Post('queues/:queueId/join')
  @ApiOperation({ summary: 'Join queue (QR landing)' })
  join(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body() dto: JoinQueueDto,
  ) {
    return this.ops.join(queueId, dto);
  }

  @Post('queues/:queueId/walk-in')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Walk-in customer (staff)' })
  walkIn(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body() dto: WalkInCustomerDto,
  ) {
    return this.ops.walkIn(queueId, dto);
  }

  @Post('queues/:queueId/call-next')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call next waiting customer' })
  callNext(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.ops.callNext(queueId);
  }

  @Public()
  @Get('queues/:queueId/snapshot')
  @ApiOperation({ summary: 'Live queue snapshot (customer tracking)' })
  snapshot(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.ops.snapshot(queueId);
  }

  @Get('queues/:queueId/metrics')
  @RequirePermissions(REPORTS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Queue metrics' })
  metrics(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.ops.metrics(queueId);
  }

  @Post('queue-entries/:entryId/hold')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  hold(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.hold(entryId);
  }

  @Post('queue-entries/:entryId/resume-held')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  resumeHeld(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.resumeHeld(entryId);
  }

  @Post('queue-entries/:entryId/skip')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  skip(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.skip(entryId);
  }

  @Post('queue-entries/:entryId/recall')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  recall(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.recall(entryId);
  }

  @Post('queue-entries/:entryId/complete')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  complete(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.complete(entryId);
  }

  @Post('queue-entries/:entryId/cancel')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  cancel(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.cancel(entryId);
  }

  @Post('queue-entries/:entryId/no-show')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  markNoShow(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MarkNoShowDto,
  ) {
    return this.ops.markNoShow(entryId, dto);
  }

  @Post('queue-entries/:entryId/move')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  move(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MoveCustomerDto,
  ) {
    return this.ops.move(entryId, dto);
  }

  @Post('queue-entries/:entryId/transfer')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  transfer(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: TransferCustomerDto,
  ) {
    return this.ops.transfer(entryId, dto);
  }

  @Post('queue-entries/:entryId/priority')
  @RequirePermissions(STAFF)
  @ApiBearerAuth()
  promote(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: PromotePriorityDto,
  ) {
    return this.ops.promote(entryId, dto);
  }

  @Public()
  @Get('queue-entries/:entryId/estimated-wait')
  @ApiOperation({ summary: 'Estimated wait (customer tracking)' })
  estimateWait(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.ops.estimateWait(entryId);
  }
}
