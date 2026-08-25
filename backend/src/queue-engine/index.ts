/**
 * Queue Engine public barrel — domain + application + in-memory adapters.
 * No HTTP controllers or Prisma adapters are exported from here.
 */

export { QueueEngineService } from './application/queue-engine.service';
export type {
  QueueEngineDeps,
  JoinQueueCommand,
  CreateQueueInput,
} from './application/queue-engine.service';
export type {
  JoinResult,
  LiveQueueSnapshot,
  LiveQueueEntrySnapshot,
} from './application/commands/types';

export type { EventBus, EventHandler, EventBusSubscription } from './application/ports/event-bus';
export type { Clock } from './application/ports/clock';
export { SystemClock, FixedClock } from './application/ports/clock';
export type {
  QueueRepository,
  QueueEntryRepository,
  CustomerRepository,
  TokenRepository,
  OperatingHoursPort,
  IncrementedTokenCounter,
} from './application/ports/repositories';
export type { UnitOfWork, TransactionRepositories } from './application/ports/unit-of-work';

export { Queue } from './domain/entities/queue.entity';
export { QueueEntry } from './domain/entities/queue-entry.entity';
export { Customer } from './domain/entities/customer.entity';
export {
  QueueStatus,
  QueueEntryStatus,
  QueueEntrySource,
  NotificationPreference,
  ACTIVE_ENTRY_STATUSES,
  TERMINAL_ENTRY_STATUSES,
} from './domain/enums';
export { QueueEvents } from './domain/events/queue-events';
export type { DomainEvent, QueueEngineEventType } from './domain/events/queue-events';
export * from './domain/exceptions/domain-errors';
export { EntryLifecyclePolicy } from './domain/policies/entry-lifecycle-policy';
export {
  CapacityPolicy,
  OrderingPolicy,
  PriorityPolicy,
  QueueStatePolicy,
  VIP_PRIORITY_BUMP,
} from './domain/policies/queue-policies';
export { TimeoutPolicy } from './domain/policies/timeout-policy';
export { DuplicateJoinPolicy } from './domain/policies/duplicate-join-policy';
export { OperatingHoursPolicy } from './domain/policies/operating-hours-policy';
export type { DayWindow } from './domain/policies/operating-hours-policy';
export {
  WaitTimeCalculator,
  MetricsCalculator,
} from './domain/services/calculators';
export {
  clampEstimatedWaitMinutes,
  estimateWaitMinutesForPosition,
  estimateWaitMinutesForCustomersAhead,
  MIN_ESTIMATED_WAIT_MINUTES,
  MAX_ESTIMATED_WAIT_MINUTES,
  SERVICE_SLOT_MINUTES,
} from './domain/services/wait-estimate-bounds';
export { TokenFactory } from './domain/factories/token-factory';
export {
  PhoneNumber,
  PartySize,
  SortOrder,
  TokenDisplayCode,
} from './domain/value-objects';
export type { WaitEstimate, QueueMetrics } from './domain/value-objects';

export { InMemoryEventBus } from './infrastructure/in-memory/in-memory-event-bus';
export {
  InMemoryQueueRepository,
  InMemoryQueueEntryRepository,
  InMemoryCustomerRepository,
  InMemoryTokenRepository,
  AlwaysOpenOperatingHours,
  FixedWindowsOperatingHours,
} from './infrastructure/in-memory/repositories';
export { InMemoryUnitOfWork } from './infrastructure/in-memory/in-memory-unit-of-work';
export { QueueLockRegistry } from './infrastructure/in-memory/queue-lock-registry';
