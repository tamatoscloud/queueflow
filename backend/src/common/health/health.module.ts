import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { NotificationsInfrastructureModule } from '../../infrastructure/notifications/notifications-infrastructure.module';

@Module({
  imports: [NotificationsInfrastructureModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
