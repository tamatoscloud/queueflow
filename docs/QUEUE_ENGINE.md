# Queue Engine

The Queue Engine is QueueFlow’s core domain service. It owns queue lifecycle,
join/call/complete flows, wait-time math, and internal domain events. It does
**not** own HTTP, Flutter, authentication, or Socket.IO — those plug in later
via ports.

Source: `backend/src/queue-engine/`  
Tests: `backend/src/queue-engine/__tests__/` (Vitest, in-memory adapters)

## Design decisions

### Why DDD with ports (not Prisma inside the engine)

The Prisma schema is the persistence contract; the engine is the **behavior**
contract. Embedding `@prisma/client` in domain code would:

1. Make unit tests require a database.
2. Couple state-machine rules to ORM shapes.
3. Block swapping storage (e.g. Redis hot-path later) without rewriting rules.

So the engine depends only on **ports** (`QueueRepository`, `EventBus`,
`Clock`, `OperatingHoursPort`). In-memory adapters make the suite fully
isolated. A Prisma adapter is intentionally deferred to the API task.

### Layering

```
application/QueueEngineService   ← façade (all required methods)
        │
        ├── domain/entities      ← Queue, QueueEntry, Customer
        ├── domain/policies      ← lifecycle, capacity, FIFO/priority, hours, timeouts
        ├── domain/services      ← WaitTimeCalculator, MetricsCalculator
        ├── domain/factories     ← TokenFactory
        ├── domain/events        ← CustomerJoined, QueuePaused, …
        └── ports                ← EventBus, repositories, Clock
                │
                └── infrastructure/in-memory  ← test + single-process default
```

Domain code never imports infrastructure. Infrastructure never contains
business rules.

### Why entities raise transitions (not anemic DTOs)

`QueueEntry.call()` / `hold()` / `complete()` go through
`EntryLifecyclePolicy` so illegal transitions fail in one place — whether
called from `callNextCustomer` or a future batch job.

### Ordering: FIFO + priority + fractional `sortOrder`

- Default: FIFO by `sortOrder` (append on join).
- `priorityEnabled`: VIP / higher `priority` first, then `sortOrder`.
- Reorder / move: fractional midpoints (`SortOrder.between`) so we don’t
  rewrite every row on a single move.
- Skip: transient `SKIPPED` then back to `WAITING` at end-of-line
  (`nextSortOrder`).

Schema columns added in migration `20260720120000_queue_engine_fields`
(`priority`, `is_vip`, `sort_order`, recall/no-show timeouts).

### Wait time

`estimatedWaitMinutes = customersAhead × averageServiceTimeMinutes`.

On complete, `Queue.recordServiceSample` updates the rolling average so ETAs
recalculate dynamically for everyone still waiting.

### Event bus (no Socket.IO yet)

`EventBus.publish` is the only integration point. `InMemoryEventBus` records
events for tests and can subscribe handlers in-process. A future Socket.IO /
Redis adapter implements the same interface without touching the engine.

### Operating hours

`OperatingHoursPolicy` is pure; windows come from `OperatingHoursPort` so the
engine doesn’t query Prisma `WorkingHours` directly. Empty windows = always
open (early tenants). Walk-ins default to `bypassOperatingHours: true`.

### Timeouts

- **Recall:** CALLED entry may be recalled only after `recallTimeoutSeconds`.
- **No-show:** `markNoShow` enforces `noShowTimeoutSeconds`; 
  `processAutomaticNoShows(queueId)` is the scheduler hook.

### Cancel Queue vs Cancel entry

Requirement “Cancel Queue” maps to cancelling a **customer’s entry**
(`cancelQueueEntry`). Closing the whole queue is `closeQueue`.

## Public API (`QueueEngineService`)

| Method | Purpose |
|---|---|
| `createQueue` | Create ACTIVE queue + `QueueCreated` |
| `openQueue` / `pauseQueue` / `resumeQueue` / `closeQueue` | Queue status |
| `joinQueue` | QR/staff join + token + ETA |
| `walkInCustomer` | Join with `WALK_IN` source |
| `cancelQueueEntry` | WAITING/HOLDING/… → CANCELLED |
| `callNextCustomer` | Next WAITING by ordering policy → CALLED |
| `recallCustomer` | Re-notify CALLED after timeout |
| `holdCustomer` / `resumeHeldCustomer` | HOLDING ↔ WAITING |
| `skipCustomer` | Skip to end of line |
| `completeCustomer` | CALLED → COMPLETED + service-time sample |
| `markNoShow` / `processAutomaticNoShows` | NO_SHOW |
| `moveCustomer` / `reorderQueue` / `priorityCustomer` | Position / VIP |
| `transferCustomer` | Move entry to another queue (same business) |
| `estimateWaitTime` / `calculateQueueMetrics` / `getLiveQueueSnapshot` | Reads |

## Entry lifecycle

```
WAITING → CALLED → COMPLETED
WAITING → HOLDING → WAITING
WAITING|CALLED → SKIPPED → WAITING   (end of line)
WAITING|HOLDING|CALLED → CANCELLED
CALLED → NO_SHOW   (after timeout, or force)
```

## Events published

`CustomerJoined`, `CustomerCalled`, `CustomerSkipped`, `CustomerHeld`,
`CustomerCompleted`, `CustomerCancelled`, `CustomerNoShow`, `CustomerMoved`,
`CustomerTransferred`, `CustomerRecalled`, `QueuePaused`, `QueueResumed`,
`QueueClosed`, `QueueOpened`, `QueueUpdated`, `QueueCreated`.

## Running tests

```bash
cd backend
npm install
npm test
npm run typecheck
```

## What is deliberately not here

- REST / controllers / auth
- Prisma repository adapter
- Socket.IO / notification sending (subscribe to `EventBus` later)
- Feedback request orchestration (post-complete product flow)

See also: [`QUEUE_ENGINE_SEQUENCES.md`](QUEUE_ENGINE_SEQUENCES.md).
