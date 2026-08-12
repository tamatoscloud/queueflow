import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';
import { QueueOperationsController } from './queue-operations.controller';
import { QueueOperationsService } from './queue-operations.service';
import { QueueSnapshotEnrichmentService } from './queue-snapshot-enrichment.service';
import { QueueEngineModule } from '../queue-engine/queue-engine.module';

@Module({
  imports: [QueueEngineModule, PrismaModule, RealtimeModule],
  controllers: [QueueOperationsController],
  providers: [QueueOperationsService, QueueSnapshotEnrichmentService],
  exports: [QueueOperationsService],
})
export class QueueOperationsModule {}
