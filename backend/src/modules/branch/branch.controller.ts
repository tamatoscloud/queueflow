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
@RequirePermissions(Permission.BRANCH_MANAGE)
@Controller({ path: 'branches', version: '1' })
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
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
  @ApiOperation({ summary: 'Get branch' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete branch' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.remove(id);
  }
}
