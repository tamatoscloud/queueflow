import { Module } from '@nestjs/common';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';

@Module({
  imports: [QueueEngineModule, RealtimeModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
