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
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardCreatedResponse, ApiStandardOkResponse } from '../../common/swagger/api-responses.decorator';
import { RequirePermissions, RequireAnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { BusinessService } from './business.service';
import {
  CreateBusinessDto,
  ListBusinessQueryDto,
  UpdateBusinessDto,
} from './dto/business.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@Controller({ path: 'businesses', version: '1' })
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @RequirePermissions(Permission.PLATFORM_MANAGE_TENANTS)
  @ApiOperation({
    summary: 'Create business',
    description: 'Registers a new tenant. Slug must be unique and URL-safe.',
  })
  @ApiStandardCreatedResponse('Business created', { id: 'uuid', name: 'Cafe Aroma', slug: 'cafe-aroma' })
  create(@Body() dto: CreateBusinessDto) {
    return this.businessService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.PLATFORM_MANAGE_TENANTS)
  @ApiOperation({
    summary: 'List businesses',
    description: 'Paginated list with optional search and status filter.',
  })
  @ApiStandardOkResponse('Paginated business list')
  list(@Query() query: ListBusinessQueryDto) {
    return this.businessService.list(query);
  }

  @Get(':id')
  @RequireAnyPermission(Permission.BUSINESS_MANAGE, Permission.PLATFORM_MANAGE_TENANTS)
  @ApiOperation({ summary: 'Get business by id' })
  @ApiStandardOkResponse('Business details')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessService.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BUSINESS_MANAGE)
  @ApiOperation({ summary: 'Update business' })
  @ApiStandardOkResponse('Updated business')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, dto);
  }
}
