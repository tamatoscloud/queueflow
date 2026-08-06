import { Global, Module } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';

@Global()
@Module({
  providers: [RedisConnectionService],
  exports: [RedisConnectionService],
})
export class RedisModule {}
