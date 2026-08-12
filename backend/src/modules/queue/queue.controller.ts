import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions, RequireAnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { QueueService } from './queue.service';
import {
  CreateQueueDto,
  ListQueueQueryDto,
  UpdateQueueDto,
} from './dto/queue.dto';

@ApiTags('queues')
@ApiBearerAuth()
@RequirePermissions(Permission.QUEUE_MANAGE)
@Controller({ path: 'queues', version: '1' })
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  @ApiOperation({ summary: 'Create queue' })
  create(@Body() dto: CreateQueueDto) {
    return this.queueService.create(dto);
  }

  @Get()
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE, Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'List queues' })
  list(@Query() query: ListQueueQueryDto) {
    return this.queueService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get queue' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update queue settings' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queueService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive / soft-delete queue' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.remove(id);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open queue' })
  open(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.open(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause queue' })
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.pause(id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume queue' })
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.resume(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close queue' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.close(id);
  }

  @Post(':id/display-credential')
  @ApiOperation({ summary: 'Issue TV display realtime credential for a queue' })
  issueDisplayCredential(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.issueDisplayCredential(id);
  }
}
