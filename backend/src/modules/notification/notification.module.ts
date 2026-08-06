import { Module } from '@nestjs/common';
import { NotificationsInfrastructureModule } from '../../infrastructure/notifications/notifications-infrastructure.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [NotificationsInfrastructureModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
