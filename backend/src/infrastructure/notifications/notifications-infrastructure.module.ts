import { Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER_REGISTRY } from '../../common/di/tokens';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { QueueEngineModule } from '../../modules/queue-engine/queue-engine.module';
import { RedisModule } from '../redis/redis.module';
import { QueueNotificationBridgeService } from './bridge/queue-notification-bridge.service';
import { NotificationQueueService } from './queue/notification-queue.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { MockNotificationProvider } from './providers/mock-notification.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { SmsNotificationProvider } from './providers/sms-notification.provider';
import { NotificationProviderRegistry } from './providers/notification-provider.registry';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationDispatcher } from './services/notification-dispatcher.service';
import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationWorker } from './worker/notification.worker';

const providerAdapters = [
  MockNotificationProvider,
  WhatsAppCloudProvider,
  SmsNotificationProvider,
];

@Module({
  imports: [PrismaModule, QueueEngineModule, RedisModule],
  providers: [
    ...providerAdapters,
    {
      provide: NOTIFICATION_PROVIDER_REGISTRY,
      useFactory: (
        mock: MockNotificationProvider,
        whatsapp: WhatsAppCloudProvider,
        sms: SmsNotificationProvider,
      ) => [mock, whatsapp, sms],
      inject: providerAdapters,
    },
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationProviderRegistry,
    NotificationTemplateService,
    NotificationDispatcher,
    NotificationDispatchService,
    NotificationQueueService,
    NotificationWorker,
    QueueNotificationBridgeService,
  ],
  exports: [
    NotificationDispatchService,
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationTemplateService,
    NotificationQueueService,
    NotificationDispatcher,
  ],
})
export class NotificationsInfrastructureModule {}
