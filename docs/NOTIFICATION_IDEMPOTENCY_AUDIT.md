# Notification Idempotency Audit — Wave 1C-C

## 1. Current architecture

```
Queue mutation (QueueEngineService)
  → eventBus.publish (after DB commit — Wave 1C-B)
  → NestEventBus (wildcard subscribers)
  → QueueNotificationBridgeService
      → NotificationDispatchService.schedule / scheduleForPreference
      → NotificationRepository.create
      → markQueued → BullMQ enqueue
  → NotificationWorker
      → NotificationDispatcher.dispatch
      → Template render → Provider (WhatsApp/SMS/Mock)
      → NotificationRepository.recordDelivery
```

**Key files:**
- Schema: `backend/prisma/schema.prisma` (`Notification`, `NotificationLog`, `NotificationTemplate`)
- Bridge: `backend/src/infrastructure/notifications/bridge/queue-notification-bridge.service.ts`
- Dispatch: `backend/src/infrastructure/notifications/services/notification-dispatch.service.ts`
- Dispatcher: `backend/src/infrastructure/notifications/services/notification-dispatcher.service.ts`
- Repository: `backend/src/infrastructure/notifications/repositories/notification.repository.ts`
- Queue: `backend/src/infrastructure/notifications/queue/notification-queue.service.ts`
- Worker: `backend/src/infrastructure/notifications/worker/notification.worker.ts`

**Statuses (pre-1C-C):** `PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`

**No unique constraint** on notification intent — each `create()` produces a new row.

## 2. Current failure modes

| Failure | Effect |
|---------|--------|
| Duplicate domain event processing | Multiple notification rows for same logical message |
| Concurrent bridge handlers | Race creating duplicate rows |
| BullMQ `jobId: ${notificationId}-${Date.now()}` | Duplicate jobs on reconcile/retry |
| Worker retry after provider success + crash before `recordDelivery` | Possible duplicate external send |
| Two workers both read `QUEUED` | Both call provider |
| `reconcilePending` | Re-enqueues without dedup check |
| Redis outage → PENDING → reconcile | May stack duplicate jobs |

## 3. Existing retry behavior

- BullMQ: up to 5 attempts, exponential backoff (default 5s)
- Exhausted jobs → DLQ (`notifications-dlq`) — no replay worker
- Manual retry API: resets `FAILED` → `PENDING` → `QUEUED` → enqueue
- Dispatcher throws on provider failure → BullMQ retries

## 4. Existing idempotency mechanisms

| Mechanism | Scope |
|-----------|-------|
| Position throttle (`lastPositionNotify` Map) | In-process only; lost on restart |
| Skip primary events in wait handler | Logic guard |
| `notificationsEnabled` gate | Skip/cancel |
| `CANCELLED` skip in dispatcher | No re-send |
| Feedback `feedbackEnabled` gate | Skip FEEDBACK_REQUEST |

**No database-level deduplication.**

## 5. Missing protections

- Deterministic notification idempotency key + unique constraint
- Atomic worker claim (`PROCESSING` state)
- Stable BullMQ job IDs
- Retryable vs permanent failure classification
- Stale `PROCESSING` recovery with documented at-least-once risk
- Event-scoped keys for primary/broadcast notifications
- Position-scoped keys for wait notifications

## 6. Proposed Wave 1C-C design

### A. Event idempotency
Derive `eventKey` from domain event: `{event.type}:{aggregateId}:{entryId?}`

### B. Notification intent idempotency
Deterministic `idempotencyKey`:
- Primary: `primary:{businessId}:{entryId}:{type}:{channel}:{event.type}`
- Wait: `wait:{entryId}:{type}:{channel}:{position}`
- Broadcast: `broadcast:{event.type}:{queueId}:{entryId}:{channel}`
- Feedback: `feedback:{entryId}:{channel}`

`UNIQUE(idempotency_key) WHERE deleted_at IS NULL` — concurrent inserts converge.

### C. Provider delivery idempotency
- Atomic `claimForProcessing`: `PENDING|QUEUED` → `PROCESSING`
- Terminal states (`SENT`, `DELIVERED`, `CANCELLED`) → no-op
- BullMQ job ID: `send-{notificationId}` (dedup at queue level)
- WhatsApp Cloud API: **no native idempotency** — application-level claim is strongest guarantee
- Stale `PROCESSING` (>5 min) reclaimable with logged at-least-once risk

### D. State machine
```
PENDING → QUEUED → PROCESSING → SENT/DELIVERED
                              → FAILED (retryable → PENDING via manual/BullMQ)
                              → CANCELLED (terminal)
```

## 7. Files expected to change

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `idempotencyKey`, `eventKey`, `processingStartedAt`, `PROCESSING` status |
| `prisma/migrations/..._notification_idempotency/` | Migration |
| `domain/notification-idempotency.ts` | Key builders (new) |
| `domain/notification.types.ts` | Extended input types |
| `repositories/notification.repository.ts` | `createIdempotent`, `claimForProcessing` |
| `services/notification-dispatch.service.ts` | Idempotent schedule |
| `services/notification-dispatcher.service.ts` | Claim, retry classification, logging |
| `queue/notification-queue.service.ts` | Stable job IDs |
| `bridge/queue-notification-bridge.service.ts` | Pass idempotency keys |
| `__tests__/notification-idempotency.test.ts` | New tests |
| `docs/NOTIFICATION_IDEMPOTENCY_AUDIT.md` | This document |
