import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CustomerPortalService } from './customer-portal.service';
import {
  SubmitFeedbackDto,
  SubscribeWebPushDto,
  UpdateEntryContactDto,
} from './dto/customer-portal.dto';

@ApiTags('customer-portal')
@Public()
@Controller({ path: 'customer-portal', version: '1' })
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Get('queues/:queueId')
  @Header('Cache-Control', 'public, max-age=8, stale-while-revalidate=20')
  @ApiOperation({ summary: 'Queue landing page context (public)' })
  landing(@Param('queueId', ParseUUIDPipe) queueId: string) {
    return this.portal.getQueueLanding(queueId);
  }

  @Get('entries/:entryId/tracking')
  @Header('Cache-Control', 'private, max-age=2, stale-while-revalidate=8')
  @ApiOperation({ summary: 'Live entry tracking context (public)' })
  tracking(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return this.portal.getEntryTracking(entryId);
  }

  @Patch('entries/:entryId/contact')
  @ApiOperation({ summary: 'Update guest phone for WhatsApp/SMS while in queue' })
  updateContact(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateEntryContactDto,
  ) {
    return this.portal.updateEntryContact(entryId, dto);
  }

  @Get('businesses/:businessId/menu')
  @ApiOperation({ summary: 'Guest-facing restaurant menu (public)' })
  menu(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.portal.getBusinessMenu(businessId);
  }

  @Get('push/vapid-public-key')
  @ApiOperation({ summary: 'VAPID public key for browser Web Push' })
  vapidPublicKey() {
    return this.portal.getWebPushPublicKey();
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Register browser Web Push subscription for an entry' })
  subscribePush(
    @Body() dto: SubscribeWebPushDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.portal.subscribeWebPush(dto, userAgent);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit post-service feedback (public)' })
  feedback(@Body() dto: SubmitFeedbackDto) {
    return this.portal.submitFeedback(dto);
  }
}
