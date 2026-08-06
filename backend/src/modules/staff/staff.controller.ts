import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { StaffService } from './staff.service';
import {
  AcceptInvitationDto,
  AssignBranchesDto,
  ChangeStaffRoleDto,
  InviteStaffDto,
} from './dto/staff.dto';
import { ApiStandardOkResponse } from '../../common/swagger/api-responses.decorator';

function requestMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

@ApiTags('staff')
@ApiBearerAuth()
@Controller({ path: 'staff', version: '1' })
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('invitations')
  @RequirePermissions(Permission.STAFF_INVITE)
  @ApiOperation({ summary: 'Invite staff member' })
  @ApiStandardOkResponse('Invitation created')
  invite(@Body() dto: InviteStaffDto, @Req() req: Request) {
    return this.staffService.invite(dto, requestMeta(req));
  }

  @Public()
  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept staff invitation and create account' })
  accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.staffService.accept(dto, requestMeta(req));
  }

  @Post('invitations/:id/resend')
  @RequirePermissions(Permission.STAFF_INVITE)
  @ApiOperation({ summary: 'Resend pending invitation' })
  resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: Request,
  ) {
    return this.staffService.resend(id, businessId, requestMeta(req));
  }

  @Patch(':userId/disable')
  @RequirePermissions(Permission.STAFF_INVITE)
  @ApiOperation({ summary: 'Disable staff account' })
  disable(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: Request,
  ) {
    return this.staffService.disable(userId, businessId, requestMeta(req));
  }

  @Put(':userId/role')
  @RequirePermissions(Permission.STAFF_MANAGE_ROLES)
  @ApiOperation({ summary: 'Change staff role' })
  changeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeStaffRoleDto,
    @Req() req: Request,
  ) {
    return this.staffService.changeRole(userId, dto, requestMeta(req));
  }

  @Put(':userId/branches')
  @RequirePermissions(Permission.STAFF_MANAGE_ROLES)
  @ApiOperation({ summary: 'Assign branches to staff' })
  assignBranches(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignBranchesDto,
    @Req() req: Request,
  ) {
    return this.staffService.assignBranches(userId, dto, requestMeta(req));
  }
}
