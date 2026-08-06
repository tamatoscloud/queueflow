import { Global, Module } from '@nestjs/common';
import {
  AlwaysOpenOperatingHours,
  FixedClock,
  InMemoryCustomerRepository,
  InMemoryEventBus,
  InMemoryQueueEntryRepository,
  InMemoryQueueRepository,
  InMemoryTokenRepository,
  QueueEngineService,
} from '../queue-engine';
import {
  CLOCK,
  CUSTOMER_REPOSITORY,
  EVENT_BUS,
  OPERATING_HOURS_PORT,
  QUEUE_ENTRY_REPOSITORY,
  QUEUE_REPOSITORY,
  TOKEN_REPOSITORY,
} from '../common/di/tokens';

/** In-memory Queue Engine wiring for HTTP integration tests (no Postgres). */
@Global()
@Module({
  providers: [
    InMemoryQueueRepository,
    InMemoryQueueEntryRepository,
    InMemoryCustomerRepository,
    InMemoryTokenRepository,
    InMemoryEventBus,
    { provide: AlwaysOpenOperatingHours, useClass: AlwaysOpenOperatingHours },
    {
      provide: FixedClock,
      useFactory: () => new FixedClock(new Date('2026-07-20T10:00:00.000Z')),
    },
    { provide: QUEUE_REPOSITORY, useExisting: InMemoryQueueRepository },
    { provide: QUEUE_ENTRY_REPOSITORY, useExisting: InMemoryQueueEntryRepository },
    { provide: CUSTOMER_REPOSITORY, useExisting: InMemoryCustomerRepository },
    { provide: TOKEN_REPOSITORY, useExisting: InMemoryTokenRepository },
    { provide: OPERATING_HOURS_PORT, useExisting: AlwaysOpenOperatingHours },
    { provide: EVENT_BUS, useExisting: InMemoryEventBus },
    { provide: CLOCK, useExisting: FixedClock },
    {
      provide: QueueEngineService,
      useFactory: (
        queues: InMemoryQueueRepository,
        entries: InMemoryQueueEntryRepository,
        customers: InMemoryCustomerRepository,
        tokens: InMemoryTokenRepository,
        eventBus: InMemoryEventBus,
        clock: FixedClock,
        operatingHours: AlwaysOpenOperatingHours,
      ) =>
        new QueueEngineService({
          queues,
          entries,
          customers,
          tokens,
          eventBus,
          clock,
          operatingHours,
        }),
      inject: [
        InMemoryQueueRepository,
        InMemoryQueueEntryRepository,
        InMemoryCustomerRepository,
        InMemoryTokenRepository,
        InMemoryEventBus,
        FixedClock,
        AlwaysOpenOperatingHours,
      ],
    },
  ],
  exports: [
    QueueEngineService,
    InMemoryQueueRepository,
    InMemoryQueueEntryRepository,
    InMemoryCustomerRepository,
    InMemoryEventBus,
  ],
})
export class QueueEngineTestModule {}
