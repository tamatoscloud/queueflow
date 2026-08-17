import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BusinessModule } from './modules/business/business.module';
import { BranchModule } from './modules/branch/branch.module';
import { QueueModule } from './modules/queue/queue.module';
import { QueueOperationsModule } from './modules/queue-operations/queue-operations.module';
import { CustomerModule } from './modules/customer/customer.module';
import { NotificationModule } from './modules/notification/notification.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ReportsModule } from './modules/reports/reports.module';
import { QueueEngineModule } from './modules/queue-engine/queue-engine.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { NotificationsInfrastructureModule } from './infrastructure/notifications/notifications-infrastructure.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { HealthModule } from './common/health/health.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    RedisModule,
    HealthModule,
    AuthModule,
    SupabaseModule,
    QueueEngineModule,
    StaffModule,
    CustomerPortalModule,
    RealtimeModule,
    NotificationsInfrastructureModule,
    PlatformAdminModule,
    BusinessModule,
    BranchModule,
    QueueModule,
    QueueOperationsModule,
    CustomerModule,
    NotificationModule,
    FeedbackModule,
    ReportsModule,
    RestaurantModule,
  ],
  controllers: [HealthController, RootController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
