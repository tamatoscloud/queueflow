import { Global, Module } from '@nestjs/common';
import { QueueEngineService } from '../../queue-engine';
import {
  CLOCK,
  CUSTOMER_REPOSITORY,
  EVENT_BUS,
  OPERATING_HOURS_PORT,
  QUEUE_ENTRY_REPOSITORY,
  QUEUE_REPOSITORY,
  TOKEN_REPOSITORY,
  UNIT_OF_WORK,
} from '../../common/di/tokens';
import { PrismaQueueRepository } from '../../infrastructure/prisma/prisma-queue.repository';
import { PrismaQueueEntryRepository } from '../../infrastructure/prisma/prisma-queue-entry.repository';
import { PrismaCustomerRepository } from '../../infrastructure/prisma/prisma-customer.repository';
import { PrismaTokenRepository } from '../../infrastructure/prisma/prisma-token.repository';
import { PrismaOperatingHoursAdapter } from '../../infrastructure/prisma/prisma-operating-hours.adapter';
import { PrismaUnitOfWork } from '../../infrastructure/prisma/prisma-unit-of-work';
import { NestEventBus } from '../../infrastructure/events/nest-event-bus';
import { NestClock } from '../../infrastructure/clock/nest-clock';

@Global()
@Module({
  providers: [
    PrismaQueueRepository,
    PrismaQueueEntryRepository,
    PrismaCustomerRepository,
    PrismaTokenRepository,
    PrismaOperatingHoursAdapter,
    PrismaUnitOfWork,
    NestEventBus,
    NestClock,
    { provide: QUEUE_REPOSITORY, useExisting: PrismaQueueRepository },
    { provide: QUEUE_ENTRY_REPOSITORY, useExisting: PrismaQueueEntryRepository },
    { provide: CUSTOMER_REPOSITORY, useExisting: PrismaCustomerRepository },
    { provide: TOKEN_REPOSITORY, useExisting: PrismaTokenRepository },
    { provide: OPERATING_HOURS_PORT, useExisting: PrismaOperatingHoursAdapter },
    { provide: EVENT_BUS, useExisting: NestEventBus },
    { provide: CLOCK, useExisting: NestClock },
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },
    {
      provide: QueueEngineService,
      useFactory: (
        queues: PrismaQueueRepository,
        entries: PrismaQueueEntryRepository,
        customers: PrismaCustomerRepository,
        tokens: PrismaTokenRepository,
        eventBus: NestEventBus,
        clock: NestClock,
        operatingHours: PrismaOperatingHoursAdapter,
        unitOfWork: PrismaUnitOfWork,
      ) =>
        new QueueEngineService({
          queues,
          entries,
          customers,
          tokens,
          eventBus,
          clock,
          operatingHours,
          unitOfWork,
        }),
      inject: [
        PrismaQueueRepository,
        PrismaQueueEntryRepository,
        PrismaCustomerRepository,
        PrismaTokenRepository,
        NestEventBus,
        NestClock,
        PrismaOperatingHoursAdapter,
        PrismaUnitOfWork,
      ],
    },
  ],
  exports: [
    QueueEngineService,
    QUEUE_REPOSITORY,
    QUEUE_ENTRY_REPOSITORY,
    CUSTOMER_REPOSITORY,
    TOKEN_REPOSITORY,
    OPERATING_HOURS_PORT,
    EVENT_BUS,
    CLOCK,
    UNIT_OF_WORK,
  ],
})
export class QueueEngineModule {}
