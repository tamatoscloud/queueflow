import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { NotificationService } from './notification.service';
import {
  ListNotificationQueryDto,
  NotificationStatsQueryDto,
  UpdateNotificationSettingsDto,
  UpsertNotificationTemplateDto,
} from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Notification history' })
  list(
    @Query() query: ListNotificationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.list(query, user);
  }

  @Get('stats')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Notification delivery statistics' })
  stats(
    @Query() query: NotificationStatsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getStats(query, user);
  }

  @Get('settings/:businessId')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get notification settings for a business' })
  getSettings(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getSettings(businessId, user);
  }

  @Patch('settings/:businessId')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update notification settings' })
  updateSettings(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.updateSettings(businessId, dto, user);
  }

  @Get('templates/:businessId')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'List notification templates' })
  listTemplates(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.listTemplates(businessId, user);
  }

  @Post('templates/:businessId')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create or update a notification template' })
  upsertTemplate(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpsertNotificationTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.upsertTemplate(businessId, dto, user);
  }

  @Post(':id/retry')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Retry a failed notification' })
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.retryFailed(businessId, id, user);
  }

  @Get(':id/logs')
  @RequirePermissions(Permission.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Delivery logs for a notification' })
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getLogs(id, user);
  }
}
