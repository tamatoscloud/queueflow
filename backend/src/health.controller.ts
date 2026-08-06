import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';
import { HealthService } from './common/health/health.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Comprehensive health check' })
  check() {
    return this.health.getDetailedHealth();
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Fast liveness probe (no dependency checks)' })
  live() {
    return { status: 'ok', service: 'queueflow-backend' };
  }
}
