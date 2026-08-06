# Queue Engine — Sequence Diagrams

Companion to [`QUEUE_ENGINE.md`](QUEUE_ENGINE.md). All flows go through
`QueueEngineService`; persistence and transport are ports.

## 1. Join queue (QR landing)

```mermaid
sequenceDiagram
  participant Client as Landing page / future API
  participant Eng as QueueEngineService
  participant Hours as OperatingHoursPort
  participant QRepo as QueueRepository
  participant ERepo as QueueEntryRepository
  participant CRepo as CustomerRepository
  participant Tokens as TokenRepository
  participant Bus as EventBus

  Client->>Eng: joinQueue(name, phone, party, preference)
  Eng->>QRepo: findById(queueId)
  Eng->>Hours: getWindows / timezone
  Note over Eng: CapacityPolicy, DuplicateJoinPolicy
  Eng->>CRepo: findByBusinessAndPhone / save
  Eng->>Eng: TokenFactory.issue + WaitTimeCalculator
  Eng->>Tokens: save(token)
  Eng->>QRepo: save(queue lastTokenNumber)
  Eng->>ERepo: save(entry) + saveMany(recalculated ETAs)
  Eng->>Bus: CustomerJoined
  Eng-->>Client: JoinResult(displayCode, estimate)
```

## 2. Call next → complete

```mermaid
sequenceDiagram
  participant Staff as Staff client / future API
  participant Eng as QueueEngineService
  participant ERepo as QueueEntryRepository
  participant QRepo as QueueRepository
  participant Bus as EventBus

  Staff->>Eng: callNextCustomer(queueId, staffId)
  Eng->>ERepo: findActiveByQueueId
  Note over Eng: OrderingPolicy.sortWaiting
  Eng->>ERepo: save(entry CALLED)
  Eng->>Bus: CustomerCalled
  Eng-->>Staff: QueueEntry

  Staff->>Eng: completeCustomer(entryId, staffId)
  Eng->>Eng: entry.complete + queue.recordServiceSample
  Eng->>QRepo: save(queue)
  Eng->>ERepo: save(entry COMPLETED)
  Eng->>ERepo: saveMany(recalculated waits)
  Eng->>Bus: CustomerCompleted (+ QueueUpdated if avg changed)
```

## 3. Hold / resume / skip

```mermaid
sequenceDiagram
  participant Staff as Staff
  participant Eng as QueueEngineService
  participant Bus as EventBus

  Staff->>Eng: holdCustomer(entryId)
  Note over Eng: CALLED|WAITING → HOLDING
  Eng->>Bus: CustomerHeld

  Staff->>Eng: resumeHeldCustomer(entryId)
  Note over Eng: HOLDING → WAITING
  Eng->>Bus: QueueUpdated(resumeHeld)

  Staff->>Eng: skipCustomer(entryId)
  Note over Eng: → SKIPPED → WAITING at end sortOrder
  Eng->>Bus: CustomerSkipped
```

## 4. Recall and automatic no-show

```mermaid
sequenceDiagram
  participant Staff as Staff / Scheduler
  participant Eng as QueueEngineService
  participant Clock as Clock
  participant Bus as EventBus

  Staff->>Eng: recallCustomer(entryId)
  Eng->>Clock: now()
  Note over Eng: TimeoutPolicy.assertRecallAllowed
  alt too early
    Eng-->>Staff: RecallTimeoutNotElapsedError
  else elapsed
    Eng->>Bus: CustomerRecalled
  end

  Staff->>Eng: processAutomaticNoShows(queueId)
  loop each CALLED past noShowTimeout
    Eng->>Eng: markNoShow(force)
    Eng->>Bus: CustomerNoShow
  end
```

## 5. Transfer between queues

```mermaid
sequenceDiagram
  participant Staff as Staff
  participant Eng as QueueEngineService
  participant Bus as EventBus

  Staff->>Eng: transferCustomer(entryId, targetQueueId)
  Note over Eng: Same businessId required
  Note over Eng: Capacity + duplicate phone on target
  Note over Eng: New token on target; entry → WAITING
  Eng->>Bus: CustomerTransferred
  Eng-->>Staff: QueueEntry (new queueId + displayCode)
```

## 6. Live snapshot (read path)

```mermaid
sequenceDiagram
  participant Client as Tracking page / dashboard
  participant Eng as QueueEngineService
  participant QRepo as QueueRepository
  participant ERepo as QueueEntryRepository

  Client->>Eng: getLiveQueueSnapshot(queueId)
  Eng->>QRepo: findById
  Eng->>ERepo: findByQueueId
  Note over Eng: MetricsCalculator + OrderingPolicy
  Eng-->>Client: LiveQueueSnapshot
```

## 7. Event fan-out (future Socket.IO)

```mermaid
sequenceDiagram
  participant Eng as QueueEngineService
  participant Bus as EventBus port
  participant Mem as InMemoryEventBus (today)
  participant Sock as Socket.IO adapter (future)

  Eng->>Bus: publish(CustomerCalled)
  Bus->>Mem: handlers / published[]
  Note over Sock: Implements EventBus;<br/>subscribes and emits to rooms
```
