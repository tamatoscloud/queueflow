import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { NotificationsInfrastructureModule } from '../../infrastructure/notifications/notifications-infrastructure.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [BusinessModule, NotificationsInfrastructureModule, RedisModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
})
export class PlatformAdminModule {}
