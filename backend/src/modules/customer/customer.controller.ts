import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/roles-permissions';
import { ApiStandardOkResponse } from '../../common/swagger/api-responses.decorator';
import { CustomerService } from './customer.service';
import {
  CustomerHistoryQueryDto,
  CustomerLookupQueryDto,
  GetCustomerQueryDto,
} from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@RequirePermissions(Permission.CUSTOMER_VIEW)
@Controller({ path: 'customers', version: '1' })
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('lookup/active')
  @ApiOperation({
    summary: 'Lookup customer active queue entries by phone',
    description:
      'Finds a customer by business + phone and returns any active queue entries.',
  })
  @ApiStandardOkResponse('Customer with active entries')
  lookupActive(@Query() query: CustomerLookupQueryDto) {
    return this.customerService.lookupActive(query);
  }

  @Get(':id/active')
  @ApiOperation({
    summary: 'Active queue status for customer',
    description: 'Returns customer profile and all active queue entries by customer id.',
  })
  @ApiStandardOkResponse('Active queue status')
  activeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetCustomerQueryDto,
  ) {
    return this.customerService.getActiveStatus(id, query);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Customer queue history',
    description: 'Paginated list of past and current queue entries for a customer.',
  })
  @ApiStandardOkResponse('Paginated queue history')
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CustomerHistoryQueryDto,
  ) {
    return this.customerService.history(id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiStandardOkResponse('Customer profile')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetCustomerQueryDto,
  ) {
    return this.customerService.get(id, query);
  }
}
