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
import { BranchService } from './branch.service';
import {
  CreateBranchDto,
  ListBranchQueryDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@Controller({ path: 'branches', version: '1' })
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @RequirePermissions(Permission.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Create branch' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Get()
  @RequireAnyPermission(Permission.BRANCH_MANAGE, Permission.REPORTS_VIEW, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'List branches' })
  list(@Query() query: ListBranchQueryDto) {
    return this.branchService.list(query);
  }

  @Get(':id')
  @RequireAnyPermission(Permission.BRANCH_MANAGE, Permission.REPORTS_VIEW, Permission.QUEUE_OPERATE)
  @ApiOperation({ summary: 'Get branch' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Update branch' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Soft-delete branch' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.remove(id);
  }
}
