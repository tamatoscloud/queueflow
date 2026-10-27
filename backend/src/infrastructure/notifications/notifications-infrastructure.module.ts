import { Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER_REGISTRY } from '../../common/di/tokens';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { QueueEngineModule } from '../../modules/queue-engine/queue-engine.module';
import { RedisModule } from '../redis/redis.module';
import { QueueNotificationBridgeService } from './bridge/queue-notification-bridge.service';
import {
  notificationQueueConfig,
  resolveNotificationQueueDriver,
} from './constants/notification-queue.constants';
import { NotificationJobRepository } from './queue/notification-job.repository';
import { NOTIFICATION_QUEUE } from './queue/notification-queue.port';
import { NotificationQueueService } from './queue/notification-queue.service';
import { PostgresNotificationQueueService } from './queue/postgres-notification-queue.service';
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
import { WebPushService } from './services/web-push.service';
import { RealtimeCredentialService } from '../realtime/services/realtime-credential.service';

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
    NotificationJobRepository,
    NotificationProviderRegistry,
    NotificationTemplateService,
    NotificationDispatcher,
    NotificationDispatchService,
    NotificationQueueService,
    PostgresNotificationQueueService,
    {
      provide: NOTIFICATION_QUEUE,
      useFactory: (
        redisQueue: NotificationQueueService,
        pgQueue: PostgresNotificationQueueService,
      ) => {
        const driver = resolveNotificationQueueDriver();
        const selected = driver === 'postgres' ? pgQueue : redisQueue;
        // Touch config early so misconfiguration is visible at boot.
        notificationQueueConfig();
        return selected;
      },
      inject: [NotificationQueueService, PostgresNotificationQueueService],
    },
    NotificationWorker,
    QueueNotificationBridgeService,
    WebPushService,
    // Stateless JWT signer (JwtService comes from the global AuthModule); used to
    // put the guest's tracking token into push and feedback links.
    RealtimeCredentialService,
  ],
  exports: [
    NotificationDispatchService,
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationTemplateService,
    NotificationQueueService,
    PostgresNotificationQueueService,
    NotificationJobRepository,
    NOTIFICATION_QUEUE,
    NotificationDispatcher,
    WebPushService,
  ],
})
export class NotificationsInfrastructureModule {}
