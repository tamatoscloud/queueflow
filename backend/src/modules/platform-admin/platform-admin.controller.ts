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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { PlatformAdminService } from './platform-admin.service';
import {
  AnalyticsRangeQueryDto,
  CreateSupportTicketDto,
  PlatformAuditQueryDto,
  PlatformBusinessUpdateDto,
  PlatformUserQueryDto,
  UpdateBusinessFeatureFlagsDto,
  UpdateGlobalFeatureFlagsDto,
  UpdatePlatformUserStatusDto,
  UpdateSubscriptionDto,
  UpdateSupportTicketDto,
} from './dto/platform-admin.dto';
import {
  CreateBusinessDto,
  ListBusinessQueryDto,
} from '../business/dto/business.dto';

const PLATFORM = Permission.PLATFORM_MANAGE_TENANTS;

@ApiTags('platform')
@ApiBearerAuth()
@Controller({ path: 'platform', version: '1' })
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @Get('dashboard')
  @RequirePermissions(PLATFORM)
  @ApiOperation({ summary: 'Platform dashboard KPIs' })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.getDashboard();
  }

  @Get('health')
  @RequirePermissions(PLATFORM)
  @ApiOperation({ summary: 'Extended system health' })
  health(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.getSystemHealth();
  }

  @Get('analytics')
  @RequirePermissions(PLATFORM)
  @ApiOperation({ summary: 'Platform analytics overview' })
  analytics(
    @Query() query: AnalyticsRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.getAnalytics(query);
  }

  @Get('businesses')
  @RequirePermissions(PLATFORM)
  listBusinesses(
    @Query() query: ListBusinessQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listBusinesses(query);
  }

  @Post('businesses')
  @RequirePermissions(PLATFORM)
  createBusiness(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.createBusiness(dto);
  }

  @Get('businesses/:id')
  @RequirePermissions(PLATFORM)
  getBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.getBusiness(id);
  }

  @Patch('businesses/:id')
  @RequirePermissions(PLATFORM)
  updateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlatformBusinessUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateBusiness(id, dto);
  }

  @Post('businesses/:id/deactivate')
  @RequirePermissions(PLATFORM)
  deactivateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.deactivateBusiness(id);
  }

  @Delete('businesses/:id')
  @RequirePermissions(PLATFORM)
  deleteBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.deleteBusiness(id);
  }

  @Get('businesses/:id/branches')
  @RequirePermissions(PLATFORM)
  listBranches(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listBranches(id);
  }

  @Get('users')
  @RequirePermissions(PLATFORM)
  listUsers(
    @Query() query: PlatformUserQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listUsers(query);
  }

  @Patch('users/:id/status')
  @RequirePermissions(PLATFORM)
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateUserStatus(id, dto, user.id);
  }

  @Post('users/:id/reset-password')
  @RequirePermissions(PLATFORM)
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.resetUserPassword(id);
  }

  @Get('subscriptions')
  @RequirePermissions(PLATFORM)
  listSubscriptions(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listSubscriptions();
  }

  @Get('plans')
  @RequirePermissions(PLATFORM)
  listPlans(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listPlans();
  }

  @Patch('subscriptions/:id')
  @RequirePermissions(PLATFORM)
  updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateSubscription(id, dto);
  }

  @Get('notifications/stats')
  @RequirePermissions(PLATFORM)
  notificationStats(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.notificationStats();
  }

  @Get('notifications/failed')
  @RequirePermissions(PLATFORM)
  failedNotifications(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listFailedNotifications();
  }

  @Post('notifications/:id/retry')
  @RequirePermissions(PLATFORM)
  retryNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.retryNotification(id);
  }

  @Get('audit-logs')
  @RequirePermissions(PLATFORM)
  auditLogs(
    @Query() query: PlatformAuditQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listAuditLogs(query);
  }

  @Get('support-tickets')
  @RequirePermissions(PLATFORM)
  supportTickets(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.listSupportTickets();
  }

  @Post('support-tickets')
  @RequirePermissions(PLATFORM)
  createTicket(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.createSupportTicket(dto, user.id);
  }

  @Patch('support-tickets/:id')
  @RequirePermissions(PLATFORM)
  updateTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateSupportTicket(id, dto);
  }

  @Get('feature-flags')
  @RequirePermissions(PLATFORM)
  featureFlags(@CurrentUser() user: AuthenticatedUser) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.getFeatureFlags();
  }

  @Patch('feature-flags/global')
  @RequirePermissions(PLATFORM)
  updateGlobalFlags(
    @Body() dto: UpdateGlobalFeatureFlagsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateGlobalFeatureFlags(dto);
  }

  @Patch('feature-flags/businesses/:businessId')
  @RequirePermissions(PLATFORM)
  updateBusinessFlags(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateBusinessFeatureFlagsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.platform.assertPlatformAdmin(user.isPlatformAdmin);
    return this.platform.updateBusinessFeatureFlags(businessId, dto);
  }
}
