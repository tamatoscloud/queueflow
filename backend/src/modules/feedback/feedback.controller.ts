import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { ListFeedbackQueryDto } from './dto/feedback.dto';

@ApiTags('feedback')
@Controller({ path: 'feedback', version: '1' })
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'List feedback' })
  list(@Query() query: ListFeedbackQueryDto) {
    return this.feedbackService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback by id' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedbackService.get(id);
  }
}
