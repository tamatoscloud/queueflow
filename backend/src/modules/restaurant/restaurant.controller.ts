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
import { Public } from '../auth/decorators/public.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantConfigDto } from './dto/restaurant-config.dto';
import { CreateQrCodeDto, UpdateQrCodeDto } from './dto/qr-code.dto';
import { AssignEntryToTableDto, CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { CreateWaiterProfileDto, UpdateWaiterStatusDto } from './dto/waiter.dto';
import { CreateKitchenOrderDto, UpdateKitchenOrderDto } from './dto/kitchen.dto';

@ApiTags('restaurant')
@Controller({ path: 'restaurant', version: '1' })
export class RestaurantController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get('config')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_MANAGE, Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get restaurant mode configuration' })
  getConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.restaurant.getConfig(user.businessId!);
  }

  @Patch('config')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Update business type and enabled service modes' })
  updateConfig(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRestaurantConfigDto) {
    return this.restaurant.updateConfig(user.businessId!, dto);
  }

  @Get('analytics')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.REPORTS_VIEW, Permission.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Mode-grouped analytics for today' })
  analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.restaurant.getModeAnalytics(user.businessId!, branchId);
  }

  // QR Codes
  @Get('qr-codes')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  listQr(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) {
    return this.restaurant.listQrCodes(user.businessId!, branchId);
  }

  @Post('qr-codes')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  createQr(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQrCodeDto) {
    return this.restaurant.createQrCode(user.businessId!, dto);
  }

  @Patch('qr-codes/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  updateQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQrCodeDto,
  ) {
    return this.restaurant.updateQrCode(user.businessId!, id, dto);
  }

  @Public()
  @Get('qr/resolve/:code')
  @ApiOperation({ summary: 'Resolve QR code slug to target URL (public)' })
  resolveQr(@Param('code') code: string) {
    return this.restaurant.resolveQrCode(code);
  }

  // Tables
  @Get('tables')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  listTables(
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.restaurant.listTables(user.businessId!, branchId);
  }

  @Post('tables')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  createTable(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTableDto) {
    return this.restaurant.createTable(user.businessId!, dto);
  }

  @Patch('tables/:id')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  updateTable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.restaurant.updateTable(user.businessId!, id, dto);
  }

  @Post('tables/:id/assign')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  assignTable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignEntryToTableDto,
  ) {
    return this.restaurant.assignEntryToTable(user.businessId!, id, dto);
  }

  // Waiters
  @Get('waiters')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  listWaiters(
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.restaurant.listWaiters(user.businessId!, branchId);
  }

  @Post('waiters')
  @ApiBearerAuth()
  @RequirePermissions(Permission.QUEUE_MANAGE)
  createWaiter(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWaiterProfileDto) {
    return this.restaurant.createWaiter(user.businessId!, dto);
  }

  @Patch('waiters/:id/status')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  updateWaiter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWaiterStatusDto,
  ) {
    return this.restaurant.updateWaiterStatus(user.businessId!, id, dto);
  }

  // Kitchen
  @Get('kitchen')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  kitchenBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.restaurant.getKitchenBoard(user.businessId!, branchId);
  }

  @Post('kitchen/orders')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  createKitchenOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateKitchenOrderDto) {
    return this.restaurant.createKitchenOrder(user.businessId!, dto);
  }

  @Patch('kitchen/orders/:id')
  @ApiBearerAuth()
  @RequireAnyPermission(Permission.QUEUE_OPERATE, Permission.QUEUE_MANAGE)
  updateKitchenOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKitchenOrderDto,
  ) {
    return this.restaurant.updateKitchenOrder(user.businessId!, id, dto);
  }
}
