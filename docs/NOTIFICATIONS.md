# Notification & Communication Platform

Sprint 8 delivers asynchronous WhatsApp/SMS notifications driven by Queue Engine domain events, without modifying queue-engine business logic.

## Architecture

```
Queue Engine (domain events)
        │
        ▼
NestEventBus ──► QueueNotificationBridgeService
        │              │
        │              ▼
        │        NotificationDispatchService
        │              │
        │              ├──► NotificationRepository (Prisma)
        │              └──► NotificationQueueService (BullMQ)
        │                        │
        │                        ▼
        │                  NotificationWorker
        │                        │
        │                        ▼
        │                  NotificationDispatcher
        │                        │
        │                        ├──► NotificationTemplateService
        │                        └──► NotificationProviderRegistry
        │                                  ├── MockProvider (dev)
        │                                  ├── WhatsAppCloudProvider
        │                                  └── SmsNotificationProvider
        │
        └──► QueueRealtimeBridgeService (unchanged)
```

## Folder structure

```
backend/src/infrastructure/notifications/
  bridge/           # Event subscription (QueueNotificationBridgeService)
  constants/        # BullMQ names, domain→notification mapping
  domain/           # Types + NotificationProvider interface
  providers/        # WhatsApp, SMS, Mock + registry
  queue/            # BullMQ queue wrapper
  repositories/     # Prisma notification + template repos
  services/         # Dispatch, dispatcher, templates
  templates/        # Variable renderer + defaults
  worker/           # BullMQ worker (in-process)
  __tests__/        # Unit tests
```

## Worker architecture

- **Queue:** `notifications` (BullMQ on Redis)
- **DLQ:** `notifications-dlq` (jobs that exhaust retries)
- **Retries:** exponential backoff, configurable via env
- **Delayed jobs:** `scheduledAt` on notification row → BullMQ `delay`
- **Concurrency:** `NOTIFICATION_WORKER_CONCURRENCY` (default 5)

The worker runs inside the NestJS process via `NotificationWorker.onModuleInit`.

## Provider abstraction

`NotificationProviderAdapter` interface:

- `supports(channel)` — channel eligibility
- `send(request)` — returns `ProviderSendResult`

Set `NOTIFICATION_USE_MOCK=true` in development to avoid external API calls.

## Domain event → notification mapping

| Event | Notification type | Recipients |
|-------|-------------------|------------|
| CustomerJoined | QUEUE_JOINED | Joining customer |
| CustomerCalled / Recalled | YOUR_TURN | Called customer |
| CustomerCancelled | QUEUE_CANCELLED | Cancelled customer |
| CustomerCompleted | FEEDBACK_REQUEST | Completed customer (delayed) |
| QueuePaused | QUEUE_PAUSED | All waiting |
| QueueResumed | QUEUE_RESUMED | All waiting |
| QueueClosed | QUEUE_CLOSED | All waiting |
| Wait-affecting events | POSITION_UPDATE / ALMOST_YOUR_TURN | Waiting (throttled) |

## Customer preferences

`QueueEntry.notificationPreference` (`WHATSAPP`, `SMS`, `BOTH`) is respected at dispatch. `BOTH` creates two notification rows.

## Business APIs

| Method | Path | Permission |
|--------|------|------------|
| GET | `/notifications` | notifications:view |
| GET | `/notifications/stats` | notifications:view |
| GET | `/notifications/:id/logs` | notifications:view |
| POST | `/notifications/:id/retry` | notifications:view |
| GET | `/notifications/settings/:businessId` | settings:manage |
| PATCH | `/notifications/settings/:businessId` | settings:manage |
| GET | `/notifications/templates/:businessId` | settings:manage |
| POST | `/notifications/templates/:businessId` | settings:manage |

## Performance notes

- Event handling is async; queue mutations are not blocked by provider latency
- Position updates throttled per entry (default 120s)
- BullMQ concurrency defaults to 5 parallel deliveries

## Production readiness

- [x] Async dispatch via BullMQ + managed Redis (`REDIS_URL`)
- [x] Retry with exponential backoff + DLQ
- [x] Provider abstraction
- [x] Delivery logs per attempt
- [x] Customer preference respect
- [x] Business template customization + multi-locale
- [x] TLS support for Upstash (`rediss://`)
- [x] Redis health check on `/api/v1/health`
- [x] Automatic reconnect with exponential backoff
- [x] Graceful degradation when Redis is unavailable (notifications stay `PENDING`, reconciled on recovery)
- [ ] Configure real WhatsApp/SMS credentials in production
- [ ] Dedicated worker process for high volume
- [ ] Provider webhook controller for DELIVERED/READ updates

## Redis setup (Upstash)

The notification queue uses **BullMQ** with a single `REDIS_URL` environment variable. No local Redis or Docker is required — use the same application binary in development and production; only env vars change.

### 1. Create an Upstash Redis database

1. Sign in at [upstash.com](https://upstash.com) and create a **Redis** database.
2. Choose a region close to your API deployment.
3. Copy the **Redis URL** from the database details page. Upstash provides a TLS URL (`rediss://…`).

### 2. Configure environment variables

Add to `backend/.env.local` (local) or your deployment secret manager (production):

```env
# Upstash (TLS) — use the URL from the Upstash console
REDIS_URL=rediss://default:YOUR_TOKEN@YOUR_ENDPOINT.upstash.io:6379

# Optional tuning (defaults shown)
REDIS_CONNECT_TIMEOUT_MS=10000
REDIS_COMMAND_TIMEOUT_MS=15000
REDIS_RECONNECT_BASE_MS=200
REDIS_RECONNECT_MAX_MS=30000
REDIS_MAX_RECONNECT_ATTEMPTS=50

# Disable the queue entirely (e.g. unit tests without Redis)
# NOTIFICATION_QUEUE_ENABLED=false

# Re-enqueue PENDING rows after Redis recovers (default 60s)
NOTIFICATION_RECONCILE_INTERVAL_MS=60000
```

For local development against a non-TLS Redis instance, use `redis://host:port` instead of `rediss://`.

### 3. Verify connectivity

Start the backend and check health:

```bash
curl http://localhost:3000/api/v1/health
```

Expected Redis section when healthy:

```json
{
  "status": "ok",
  "checks": {
    "redis": {
      "enabled": true,
      "status": "up",
      "latencyMs": 42
    }
  }
}
```

If Redis is temporarily unreachable, status is `degraded` and notifications are stored as `PENDING` until the reconcile loop re-enqueues them.

### Connection behavior

- **TLS:** URLs starting with `rediss://` enable TLS automatically (required for Upstash).
- **Reconnect:** ioredis uses exponential backoff (`REDIS_RECONNECT_BASE_MS` → `REDIS_RECONNECT_MAX_MS`, capped at `REDIS_MAX_RECONNECT_ATTEMPTS`).
- **BullMQ:** Queue, worker, and DLQ each use a dedicated Redis connection (BullMQ requirement).
- **Outages:** Enqueue failures revert notifications to `PENDING`; the worker reconciler retries on an interval and after reconnect events.
