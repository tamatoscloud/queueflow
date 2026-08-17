import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';
import { getAppEnvironment } from './config/env.validation';

@ApiTags('root')
@Controller({ path: '/', version: VERSION_NEUTRAL })
export class RootController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Service metadata for the API host root' })
  info() {
    return {
      service: 'queueflow-backend',
      status: 'ok',
      environment: getAppEnvironment(),
    };
  }
}
