# Redis → PostgreSQL Notification Queue Migration

**Date:** 2026-08-12  
**Status:** Implementation complete behind feature flag — **NOT cut over**  
**Commit state:** Committed for staging validation (default driver still `redis`; no cutover)  
**Default driver:** `redis` (BullMQ) — unchanged until staging validation

---

## 1. Existing Redis architecture

```
Domain event
  → QueueNotificationBridgeService
  → NotificationDispatchService.schedule
       → NotificationRepository.createIdempotent (unique idempotency_key)
       → markQueued
       → NotificationQueueService.enqueueSend (BullMQ jobId=send-{id})
  → NotificationWorker (in-process BullMQ Worker)
       → NotificationDispatcher.dispatch
            → claimForProcessing on notifications row
            → provider.send
            → recordDelivery
```

Redis was used **only** for BullMQ job transport (waiting/active/delayed/DLQ). Queue-engine concurrency already used PostgreSQL.

## 2. Why Redis was used

- Durable async delivery after HTTP request returns
- Retries with exponential backoff
- Concurrent workers (BullMQ concurrency)
- Stable job IDs for duplicate enqueue suppression
- DLQ after max attempts

## 3. PostgreSQL replacement architecture

```
Same bridge / dispatch / dispatcher / providers
  → NotificationQueuePort (DI)
       ├─ redis  → NotificationQueueService (BullMQ)  [DEFAULT]
       └─ postgres → PostgresNotificationQueueService
              → notification_jobs table
              → FOR UPDATE SKIP LOCKED claim
              → in-process poll loop
```

Feature flag:

```
NOTIFICATION_QUEUE_DRIVER=redis|postgres
```

Default: **`redis`**

Postgres path enables without `REDIS_URL`.

## 4. Schema changes

Migration (local only — **not applied** to staging/prod in this task):

`backend/prisma/migrations/20260812190000_notification_jobs_postgres_queue/migration.sql`

Table `notification_jobs`:

| Column | Purpose |
|--------|---------|
| `id` | Job PK |
| `notification_id` | Unique FK → notifications (mirrors BullMQ jobId) |
| `status` | PENDING / PROCESSING / COMPLETED / FAILED / DEAD |
| `attempts` / `max_attempts` | Retry accounting |
| `available_at` | Delayed retry / schedule |
| `locked_at` / `locked_by` | Lease for crash recovery |
| `last_error` | Last failure message |
| `processed_at` | Completion timestamp |

Indexes: `(status, available_at)`, `(locked_at)`, unique `(notification_id)`.

Prisma models: `NotificationJob`, enum `NotificationJobStatus`.

## 5. Worker design

- Remains **in-process** with NestJS API (`NotificationWorker.onModuleInit`)
- Postgres driver polls every `NOTIFICATION_PG_POLL_INTERVAL_MS` (default 1000)
- Claims up to `min(concurrency - active, claimBatch)`
- Processes via existing `NotificationDispatcher`
- Graceful shutdown: stop polling, wait up to 10s for in-flight jobs

## 6. Concurrency strategy

Atomic claim:

```sql
SELECT … FROM notification_jobs
WHERE (PENDING AND available_at <= now())
   OR (PROCESSING AND locked_at < lease_cutoff)
ORDER BY available_at
LIMIT n
FOR UPDATE SKIP LOCKED
```

Then update to PROCESSING with incremented attempts.

Guarantees: two workers cannot claim the same row.

## 7. Retry strategy

Preserved from BullMQ config:

| Setting | Env | Default |
|---------|-----|---------|
| Max attempts | `NOTIFICATION_MAX_ATTEMPTS` | 5 |
| Base backoff | `NOTIFICATION_BACKOFF_MS` | 5000 |
| Backoff | exponential `base * 2^(attempts-1)` | same intent as BullMQ |

- Retryable provider errors → rethrow → job PENDING with delay
- `NonRetryableNotificationError` → job FAILED (notification already FAILED)
- attempts ≥ maxAttempts → job DEAD (BullMQ DLQ analogue)

## 8. Crash recovery

- PROCESSING jobs with `locked_at` older than `NOTIFICATION_PG_LEASE_MS` (default = `NOTIFICATION_STALE_PROCESSING_MS` or 5m) are reclaimable
- Notification-row stale PROCESSING reclaim (Phase 10) remains in `claimForProcessing`

## 9. Idempotency

Unchanged:

- `notifications.idempotency_key` UNIQUE
- `createIdempotent` on schedule
- Terminal statuses skip re-enqueue
- Unique `notification_jobs.notification_id` prevents duplicate active jobs
- Dispatcher claim prevents duplicate provider sends

## 10. Security

- No change to Socket.IO, auth, tenant isolation, or public join
- Notification payloads/providers unchanged
- Jobs are server-side only (no client API added)

## 11. Tests

| Suite | Result |
|-------|--------|
| New `postgres-notification-queue.test.ts` | 10 passed |
| Full backend `npm test` | **182/182 passed** |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |

Covered: driver config, concurrent claim simulation (100 jobs / 10 workers), success, retry, permanent failure, duplicate enqueue no-op.

## 12. Redis / BullMQ references remaining

| Area | Status |
|------|--------|
| `NotificationQueueService` + bullmq | **Kept** (default driver) |
| `ioredis` / RedisModule | **Kept** (redis driver + health) |
| Postgres driver | **New** — no Redis |

Redis is **removable after** staging validates `NOTIFICATION_QUEUE_DRIVER=postgres` and Redis driver code is deleted in a follow-up.

## 13. Migration risks

| Risk | Mitigation |
|------|------------|
| Migration not applied yet | Apply only to staging first |
| Dual-write confusion | Single driver selected at boot |
| Lease too short/long | Tunable via env |
| Poll latency | Default 1s; acceptable for notifications |

## 14. Rollback strategy

1. Set `NOTIFICATION_QUEUE_DRIVER=redis`
2. Ensure `REDIS_URL` set
3. Restart Nest process  
No schema rollback required for emergency revert (jobs table can remain unused).

## 15. Deployment plan (future — not executed)

1. Apply migration `20260812190000_notification_jobs_postgres_queue` on staging
2. Deploy Nest with default still `redis`
3. Flip staging to `NOTIFICATION_QUEUE_DRIVER=postgres`, omit Redis
4. Run notification + Phase 10 smoke
5. Production: migrate → deploy → flip driver → remove Upstash

## 16. Cost impact

| Before | After (planned) |
|--------|-----------------|
| Vercel + Railway + Supabase + Upstash | Vercel + Railway + Supabase |
| Redis: required for notifications | Redis: **REMOVABLE** |
| Socket.IO | **UNCHANGED** |
| Railway | **STILL REQUIRED** |

---

## Implementation status summary

| Item | Value |
|------|-------|
| Feature flag | `NOTIFICATION_QUEUE_DRIVER` |
| Current default | **`redis`** |
| Redis removable now? | **Not yet** — default still redis; staging cutover pending |
| Railway still required? | **Yes** |
| Socket.IO unchanged? | **Yes** |
| Estimated cutover risk | **MEDIUM** (isolated to notifications) |
| Exact next step | Apply PG migration on staging → set driver=postgres → smoke notifications |
| Ready for staging? | **READY FOR STAGING** (flagged; do not remove Redis until validated) |
