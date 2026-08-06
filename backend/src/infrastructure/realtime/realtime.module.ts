import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { QueueRealtimeGateway } from './gateway/queue-realtime.gateway';
import { QueueRealtimeBridgeService } from './services/queue-realtime-bridge.service';
import { QueueRealtimeEmitterService } from './services/queue-realtime-emitter.service';
import { SocketAuthService } from './services/socket-auth.service';

@Module({
  imports: [AuthModule],
  providers: [
    QueueRealtimeGateway,
    QueueRealtimeBridgeService,
    QueueRealtimeEmitterService,
    SocketAuthService,
  ],
  exports: [QueueRealtimeEmitterService, QueueRealtimeBridgeService],
})
export class RealtimeModule {}
