import { Module } from '@nestjs/common';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';

@Module({
  imports: [QueueEngineModule, RealtimeModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService],
})
export class CustomerPortalModule {}
