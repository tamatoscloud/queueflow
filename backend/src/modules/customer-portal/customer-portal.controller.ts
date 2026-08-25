import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CustomerPortalService } from './customer-portal.service';
import { SubmitFeedbackDto } from './dto/customer-portal.dto';

@ApiTags('customer-portal')
@Public()
@Controller({ path: 'customer-portal', version: '1' })
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Get('queues/:queueId')
  @ApiOperation({ summary: 'Queue landing page context (public)' })
  landing(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.portal.getQueueLanding(queueId);
  }

  @Get('entries/:entryId/tracking')
  @ApiOperation({ summary: 'Live entry tracking context (public)' })
  tracking(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.portal.getEntryTracking(entryId);
  }

  @Get('businesses/:businessId/menu')
  @ApiOperation({ summary: 'Guest-facing restaurant menu (public)' })
  menu(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.portal.getBusinessMenu(businessId);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit post-service feedback (public)' })
  feedback(@Body() dto: SubmitFeedbackDto) {
    return this.portal.submitFeedback(dto);
  }
}
