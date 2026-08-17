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
@Controller({ path: 'queues', version: '1' })
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  @RequirePermissions(Permission.QUEUE_MANAGE)
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
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE, Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get queue' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Update queue settings' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queueService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Archive / soft-delete queue' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.remove(id);
  }

  @Post(':id/open')
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'Open queue' })
  open(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.open(id);
  }

  @Post(':id/pause')
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'Pause queue' })
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.pause(id);
  }

  @Post(':id/resume')
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'Resume queue' })
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.resume(id);
  }

  @Post(':id/close')
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'Close queue' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.close(id);
  }

  @Post(':id/display-credential')
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Issue TV display realtime credential for a queue' })
  issueDisplayCredential(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.issueDisplayCredential(id);
  }
}
