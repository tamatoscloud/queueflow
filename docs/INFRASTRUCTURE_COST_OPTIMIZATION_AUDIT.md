# QueueFlow — Infrastructure Cost Optimization Audit

**Date:** 2026-08-12  
**Type:** Architecture & feasibility audit only  
**Scope:** Can QueueFlow run without Railway and/or Upstash Redis while preserving Phase 10 security, correctness, and acceptable realtime UX?  
**Code modified:** NONE  
**Deployments / migrations / cloud changes:** NONE

---

## 1. Executive Summary

### Facts (from repository)

| Finding | Evidence |
|---------|----------|
| Backend is NestJS with a long-lived Node process | `backend/src/main.ts`, `npm run start:*` |
| Socket.IO namespace `/realtime` runs in that process | `QueueRealtimeGateway`, `IoAdapter` |
| Redis is used **only** for BullMQ notification jobs + health probes | `RedisConnectionService`, `NotificationQueueService` |
| Queue-engine concurrency uses **PostgreSQL** `FOR UPDATE` / `SKIP LOCKED`, not Redis | `PrismaUnitOfWork`, transactional repositories |
| Notification worker runs **in-process** with the API | `NotificationWorker.onModuleInit` |
| Separate `worker:notifications` bootstrap file is **missing** | Script exists; source bootstrap not found |
| Supabase Auth / Realtime / Storage / Edge are **not wired** in app code | Only `SupabaseService` admin client for health |
| Customer portal, TV, staff, business apps use Socket.IO clients | Portal + Flutter realtime clients |
| Nest `ThrottlerModule` is in-process (not Redis) | `AppModule` |

### Recommendation (one choice)

**B. Vercel + Supabase + Railway**

Remove Upstash Redis as the first cost cut. Keep a persistent NestJS process (Railway or equivalent) for Socket.IO + API + notification processing. Do **not** attempt “Vercel + Supabase only” as the first migration — it requires replacing Socket.IO and largely re-platforming NestJS (VERY HIGH risk/effort).

### Implementation update (2026-08-12)

PostgreSQL notification job queue implemented behind:

`NOTIFICATION_QUEUE_DRIVER=redis|postgres` (**default remains `redis`**)

See `docs/REDIS_TO_POSTGRES_NOTIFICATION_MIGRATION.md`.

| Before | After planned cutover |
|--------|------------------------|
| Vercel + Railway + Supabase + Upstash Redis | Vercel + Railway + Supabase |
| Redis | **REMOVABLE** (after staging validates postgres driver) |
| Socket.IO | **UNCHANGED** |

### GO / NO-GO

**GO WITH RAILWAY**

Redis can be eliminated with a PostgreSQL-backed notification job design (MEDIUM effort — **implemented, not cut over**). Socket.IO does not require a separate paid service today — it rides on the NestJS process. Removing Railway without a Socket.IO replacement is **NO-GO**.

---

## 2. Current Architecture

### Runtime topology (as implemented)

```
GitHub (source)
├── Customer portal (Next.js) → intended Vercel
├── Flutter web/mobile apps → static CDN / stores
└── NestJS backend (intended Railway / Node host)
    ├── REST API (/api/v1)
    ├── Socket.IO (/realtime)
    ├── Prisma → PostgreSQL (Supabase-compatible DATABASE_URL)
    ├── In-process NestEventBus → realtime bridge + notification bridge
    ├── BullMQ → Redis (Upstash intended)
    └── NotificationWorker (in-process BullMQ Worker)
```

### Dependency map

| Feature | Technology | Why it exists | Persistent server? | Redis? | WebSocket server? | Supabase replace? | Vercel replace? | Difficulty |
|---------|------------|---------------|--------------------|--------|-------------------|-------------------|-----------------|------------|
| REST API | NestJS | Business/queue/auth APIs | Preferred long-lived | No | No | Edge Functions (partial) | Serverless (partial) | HIGH |
| Queue engine | NestJS + Prisma | Join/call/transfer concurrency | No (DB-backed) | **No** | No | Postgres only (already) | N/A | — |
| Realtime sync | Socket.IO | Staff/TV/customer live updates | **Yes** | No (today) | **Yes** | Realtime Broadcast/Changes | **No** (no WS server) | HIGH |
| Notification enqueue | BullMQ | Async delivery + retries | Worker process | **Yes** | No | PG jobs + Edge/Cron | Cron + serverless | MEDIUM |
| Notification delivery | Providers | WhatsApp/SMS/mock | Worker | Indirect | No | Edge Functions | Serverless | MEDIUM |
| Auth sessions | Nest JWT + DB | Staff/business auth | No | No | No | Supabase Auth (rewrite) | N/A | HIGH |
| Entry/TV credentials | Custom JWTs | Phase 10 realtime auth | No | No | No | Custom claims + RLS | N/A | HIGH |
| Rate limit | Nest Throttler | API abuse protection | In-process | No | No | — | Edge middleware | LOW |
| Health | Nest HealthService | Ops probes | Yes | Optional probe | Stub | — | — | — |
| Portal UI | Next.js | Public join/track | No (SSR/static) | No | Client only | — | **Yes** | LOW |
| TV/Staff/Business | Flutter | Ops consoles | No | No | Client only | — | Static host | LOW |

---

## 3. Redis Audit

### Every operational Redis use

| File | Class / function | Why Redis | Data | TTL | Persistence | Ordering | Atomicity | Category |
|------|------------------|-----------|------|-----|-------------|----------|-----------|----------|
| `backend/src/infrastructure/redis/redis-connection.service.ts` | `RedisConnectionService` | Connection factory + `PING` health | N/A | N/A | No | No | No | Probe |
| `backend/src/infrastructure/redis/redis.config.ts` | `loadRedisConfig` | Env → ioredis options | Config | N/A | No | No | No | Config |
| `backend/src/infrastructure/notifications/queue/notification-queue.service.ts` | `NotificationQueueService` | BullMQ `Queue` + `Worker` + DLQ | Job payloads (`notificationId`, etc.) | Job retention via env | **Yes** (jobs) | Preferred | Job claim / jobId | **Queue** |
| `backend/src/infrastructure/notifications/worker/notification.worker.ts` | `NotificationWorker` | Starts BullMQ worker + reconcile timer | Consumes jobs | N/A | Relies on queue | Retry order | Claim via DB+queue | **Queue** |
| `backend/src/common/health/health.service.ts` | `checkRedis` / queue checks | Health KPI | N/A | N/A | No | No | No | Probe |
| `backend/src/modules/platform-admin/platform-admin.service.ts` | dashboard health | KPI | N/A | N/A | No | No | No | Probe |
| Tests / docker / docs | various | Local/test/docs | — | — | — | — | — | Non-prod |

### Not found (important)

- Redis cache
- Redis session store
- Redis rate limiting
- Redis pub/sub for Socket.IO (`@socket.io/redis-adapter` absent)
- Redis distributed locks for queue-engine
- BullMQ `QueueEvents` class usage

### Classification

| Redis dependency | Class |
|------------------|-------|
| BullMQ notification queue + DLQ + retries | **B** (PostgreSQL job table) or **E** (dedicated queue) — **not F mandatory** |
| Health PING | **A** (eliminate or probe PG instead) |
| Everything else assumed Redis elsewhere | **A** — not present |

**Conclusion:** Redis is **not** required for queue correctness. It is required today only because BullMQ was chosen for notifications. Removing Redis is feasible if notifications move to PostgreSQL (+ cron/worker).

---

## 4. Socket.IO Audit

### Backend

| Component | Path |
|-----------|------|
| Gateway | `backend/src/infrastructure/realtime/gateway/queue-realtime.gateway.ts` |
| Auth | `socket-auth.service.ts` — `handshake.auth.token` or query token |
| Authorizer | `realtime-subscription-authorizer.service.ts` |
| Credentials | `realtime-credential.service.ts` (entry tracking + TV display JWTs) |
| Bridge | `queue-realtime-bridge.service.ts` — domain events → emit |
| Emitter | `queue-realtime-emitter.service.ts` |
| Events | `constants/socket-events.ts` |
| Rooms | `constants/rooms.ts` |
| Bus | `nest-event-bus.ts` — **in-process** (not Redis) |

Namespace: `/realtime`  
Ack: every subscribe returns `{ ok, room?, error? }`  
Room join: **only after** authorization succeeds (Phase 10)

### Client → server events

| Event | Who | Auth | Room |
|-------|-----|------|------|
| `subscribe:entry` | Customer portal | `trackingToken` or staff | `entry:{entryId}` |
| `subscribe:queue` | Staff (restricted) | Staff JWT | `queue:{queueId}` |
| `subscribe:queue-display` | TV | `displayToken` or staff | `queue:{queueId}:display` |
| `subscribe:queue-detail` | Staff/business | Staff JWT | `queue:{queueId}:detail` |
| `subscribe:business-dashboard` | Staff/business | Staff JWT | `business:{id}:dashboard` |
| `subscribe:business-queues` | Staff/business | Staff JWT | `business:{id}:queues` |
| `unsubscribe` | Any | — | leave room |

### Server → client events

`QueueUpdated`, `CustomerJoined`, `CustomerCalled`, `CustomerHeld`, `CustomerSkipped`, `CustomerCompleted`, `QueuePaused`, `QueueResumed`, `QueueClosed`, `EstimatedWaitChanged`

### Clients

| App | Client | Notes |
|-----|--------|-------|
| customer-portal | `socket.io-client` | Entry subscribe + ack; landing = HTTP polling only |
| staff_app | Flutter Socket.IO | handshake JWT; polling fallback |
| business_app | Flutter Socket.IO | same |
| tv_display | Flutter Socket.IO | display credential |
| customer_app | — | **No Socket.IO found** |
| admin_panel | — | Health UI only |

### Per-event characteristics

| Concern | Assessment |
|---------|------------|
| Guaranteed delivery | **Best-effort**; clients have HTTP polling fallback |
| Acknowledgement | Subscribe ack required (auth gate); event acks not required |
| Ordering | Preferable for call/TV; not hard-durable |
| Latency | **HIGH** for call/TV; **MEDIUM** for ETA/dashboard |
| Authorization | **CRITICAL** — Phase 10 tenant/entry/display isolation |
| Durable? | Events are **transient**; source of truth is PostgreSQL |

---

## 5. Supabase Realtime Feasibility

### Current Supabase usage (fact)

- PostgreSQL via Prisma `DATABASE_URL`
- Thin admin client for health (`business` select)
- **Not used:** Auth, Realtime, Storage, Edge Functions in application code

### Mapping Socket.IO → Supabase Realtime

| Socket.IO | Best Supabase mechanism | Rationale |
|-----------|-------------------------|-----------|
| Domain mutation emits | **Broadcast** (server-sent after commit) | Matches “post-commit publish”; keeps auth on Nest |
| `subscribe:entry` | Private channel `entry:{id}` via Broadcast | Avoid exposing full entry rows; token auth today ≠ RLS |
| `subscribe:queue-display` | Private channel `queue:{id}:display` | TV needs filtered payload; not raw tables |
| `subscribe:queue-detail` | Broadcast or filtered Postgres Changes | Staff needs rich console state |
| Dashboard / queues list | Broadcast or Postgres Changes on queues/entries | Changes possible if RLS matches Nest authorization |
| Presence | Optional for staff online | Not currently required |

**Do not** use Postgres Changes alone without RLS that reproduces Nest JWT + trackingToken + displayToken authorization. Phase 10 credentials are **Nest-issued**, not Supabase Auth sessions.

### Feasible patterns

1. **Hybrid (recommended if migrating realtime):** Nest remains source of truth for auth; after commit, Nest broadcasts on Supabase Realtime private channels using service role / channel auth.
2. **Full RLS:** Requires redesigning auth onto Supabase Auth + RLS policies mirroring Phase 10 — **VERY HIGH** / security regression risk.

### Feasibility verdict

Supabase Realtime **can** replace Socket.IO for UX, but **not** as a drop-in without either:

- keeping Nest as the authorization + broadcast publisher, or  
- rebuilding auth on Supabase Auth + RLS.

Removing Socket.IO **does not** by itself remove Railway if Nest still hosts the API.

---

## 6. Railway Audit

### What requires a continuously running Node process today

| Capability | Continuous process? | Why |
|------------|---------------------|-----|
| NestJS REST API | Preferred | Long request handlers, DI, Prisma pool |
| Socket.IO gateway | **Yes** | Stateful WS connections |
| NotificationWorker + BullMQ | **Yes** (or separate worker) | Job consumer + `setInterval` reconcile |
| NestEventBus | In-process with API | Fan-out to bridges |

### Can NestJS move?

| Option | Viable? | Constraints |
|--------|---------|-------------|
| A. Vercel serverless | **Poor fit** | Cold starts; **no native Socket.IO server**; 10–60s limits; Prisma connection care |
| B. Supabase Edge Functions | **Poor fit for whole Nest** | Deno; rewrite APIs; still no Socket.IO equivalent on Edge |
| C. Hybrid Vercel + Supabase | Portal on Vercel; API elsewhere | Realtime must move to Supabase Realtime first |
| D. Keep Railway (or Fly/Render) | **Best fit for current Nest** | One Node service hosts API + WS + worker |

### Railway-specific code

**NONE found** (`railway.toml` / `railway.json` absent). Railway is a **deployment assumption** in docs, not a code dependency. Any long-lived Node host works.

---

## 7. Notification Architecture

| Piece | Implementation |
|-------|----------------|
| Trigger | Domain events → `QueueNotificationBridgeService` |
| Idempotency | DB `idempotency_key` + BullMQ stable `jobId` (Phase 10) |
| Queue | BullMQ on Redis |
| Worker | In-process `NotificationWorker` |
| Providers | Mock / WhatsApp / SMS |
| Retries | BullMQ attempts + backoff; non-retryable terminal |
| Reconcile | `setInterval` re-enqueue PENDING |
| Stale PROCESSING | Supported via dispatch service + migration fields |

### Without Redis — feasibility

| Alternative | Feasible? | Notes |
|-------------|-----------|-------|
| PostgreSQL `notification_jobs` table | **Yes** | Poll / `SKIP LOCKED` claim; fits existing idempotency columns |
| Vercel Cron + serverless dispatch | Partial | Good for polling PENDING; not for Socket.IO |
| Supabase Edge + pg_cron | Partial | Possible; UNKNOWN operational maturity in this repo |
| Keep BullMQ/Redis | Yes | Current design |
| In-process only without queue | Risky | Loses durability across restarts |

**Recommendation for cost cut:** Replace BullMQ with PostgreSQL job claiming on the Nest process (or cron). Staging can keep `NOTIFICATION_USE_MOCK=true`.

---

## 8. Queue Concurrency

### Facts

| Operation path | Locking |
|----------------|---------|
| `commitMutation` | `unitOfWork.runForQueues` then publish events |
| Production | Prisma `$transaction` + `FOR UPDATE` on queues (sorted) |
| `claimNextWaiting` | `FOR UPDATE SKIP LOCKED` |
| Entry locks | `FOR UPDATE` on entries |
| In-memory tests | `QueueLockRegistry` mutex — not Redis |
| Redis locks | **NOT FOUND** |

### Verdict

PostgreSQL alone **already** provides QueueFlow’s concurrency model for join/callNext/transfer (Phase 10 Wave 1C-B). **Removing Redis does not weaken queue atomicity.**

Remaining risk (pre-existing): not all mutations may be fully under `commitMutation` — accepted Phase 10 warning; unrelated to Redis.

---

## 9. Security / Tenant Isolation

### Phase 10 contracts that must not weaken

- Server-side authorize **before** room join
- Entry trackingToken scoped to entry
- Display credential scoped to queue
- Staff JWT + session validation; revoked sessions rejected
- Cross-tenant subscribe rejected
- Public join cannot inject VIP/priority/bypass
- No JWT/token in URLs/logs

### Socket.IO → Supabase Realtime risks

| Risk | Severity |
|------|----------|
| Subscribing clients directly to Postgres Changes without equivalent RLS | **P0** |
| Mapping Nest JWTs to Supabase Realtime without private channel auth | **P0** |
| Broadcasting with service role but forgetting channel ACL | **P0** |
| Losing subscribe ack gating → clients stop polling too early | **P1** |
| Using Supabase Auth as drop-in for Nest Auth | **HIGH rewrite** |

### Verdict

Realtime migration is possible **only** with an auth design that preserves Phase 10. Prefer Nest-authorized Broadcast. Do not treat “Supabase Realtime” as automatic security parity.

---

## 10. Performance Analysis

| Update type | Latency need | Socket.IO today | Supabase Realtime | Practically OK? |
|-------------|--------------|-----------------|-------------------|-----------------|
| Customer called / recall | **CRITICAL** | Low tens of ms (same process) | Typically ~50–200ms+ (UNKNOWN exact) | **Yes** for queue UX if Broadcast used |
| TV display board | **CRITICAL** | Low | Same as above | **Yes** if &lt;~300–500ms typical |
| Hold / skip / complete | **HIGH** | Low | OK | Yes |
| ETA / wait changed | **MEDIUM** | Low | OK | Yes |
| Dashboard aggregates | **MEDIUM** | Low | OK | Yes |
| Customer tracking | **HIGH** | Low + polling fallback | OK + polling | Yes |

**Assessment:** For a queue product, Supabase Realtime latency is usually **acceptable**. Do not reject it solely because Socket.IO is theoretically faster. Reject only if security or reconnect/ack semantics regress.

HTTP polling fallback already exists on clients — softens realtime provider risk.

---

## 11. Cost Comparison

Exact dollar amounts: **UNKNOWN** (no billing data in repo). Relative comparison:

| Architecture | Components | Ops complexity | Deployments | Credentials | Startup cost | Realtime | Reliability |
|--------------|------------|----------------|-------------|-------------|--------------|----------|-------------|
| **Current intended** Vercel + Railway + Supabase + Upstash | 4 | High | Many | Many | **REQUIRES PAID** Redis + Node + DB | Strong | Strong |
| **Proposed cheapest safe** Vercel + Supabase + Railway (no Redis) | 3 | Medium | Medium | Fewer | **LOW–VARIABLE** (drop Upstash) | Strong (Socket.IO on Railway) | Strong |
| **Vercel + Supabase only** | 2 | High rewrite | Medium | Medium | **LOW** after rewrite | Depends on Realtime migration | Risk until proven |
| **Hybrid keep Redis** | 4 | High | Many | Many | Higher | Strong | Strong |

**Estimated infrastructure savings (qualitative):** Eliminating Upstash removes one always-on paid dependency. Eliminating Railway only saves money after Socket.IO+Nest are re-homed — large engineering cost may exceed infra savings at startup scale.

---

## 12. Migration Complexity

| Work item | Complexity | Effort (hours, rough) |
|-----------|------------|------------------------|
| 1. Remove Redis (replace BullMQ with PG jobs) | **MEDIUM** | 24–60 |
| 2. Remove BullMQ | **MEDIUM** | included above |
| 3. Replace Socket.IO | **HIGH** | 60–120 |
| 4. Introduce Supabase Realtime | **HIGH** | 40–80 (plus security tests) |
| 5. Move backend off Railway | **HIGH–VERY HIGH** | 80–200 |
| 6. Move APIs to Vercel serverless | **VERY HIGH** | 120–250 |
| 7. Move APIs to Supabase Edge | **VERY HIGH** | 150–300 |
| 8. Keep NestJS backend | **LOW** | 0 |
| 9. Keep Railway only for backend | **LOW** | 0–8 |
| 10. Hybrid (portal Vercel, API Railway, PG Supabase, no Redis) | **MEDIUM** | 24–60 |

---

## 13. Recommended Architecture

### Choice: **B. Vercel + Supabase + Railway**

**Why:**

1. **Redis is optional** in this codebase — only BullMQ notifications need it.
2. **Socket.IO requires a persistent Node process** — Nest already provides it; putting Nest on Railway (or Fly/Render) is the least-risk host.
3. **Queue concurrency already uses PostgreSQL** — no Redis for correctness.
4. **Phase 10 security** is Nest-centric; ripping Nest for Vercel serverless first would jeopardize that work.
5. Customer portal on Vercel is already the natural fit.

### Single component that must remain (if cutting to minimum)

**A long-lived Node backend (Railway or equivalent)** — until Socket.IO is replaced **and** notification workers are redesigned for serverless/cron.

### What to remove first

**Upstash Redis / BullMQ** → PostgreSQL notification jobs + in-process or cron worker on Nest.

### What not to remove yet

**Railway (or equivalent Node host)** and **Socket.IO**.

---

## 14. Migration Plan (do not execute yet)

| Phase | Work | Exit criteria |
|-------|------|---------------|
| A | This audit | Accepted by stakeholders |
| B | Design PG `notification_jobs` claim (`SKIP LOCKED`) mirroring idempotency | Design review |
| C | Implement PG jobs behind feature flag; keep BullMQ fallback | Staging tests |
| D | Staging: disable Redis; mock notifications; verify retries/idempotency | PASS |
| E | Optional PoC: Nest Broadcast → Supabase Realtime for one channel (TV) | Latency + auth PASS |
| F | Broader Socket.IO replacement (if desired) | Phase 10 security matrix PASS |
| G | Only then evaluate moving Nest off Railway | Health + WS alternative proven |
| H | Security regression (Phase 10 matrix) | PASS |
| I | Load / concurrency on real Postgres | PASS |
| J | Production cutover | Controlled |

---

## 15. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Premature Vercel-only Nest migration | **P0** | Keep Railway until Socket.IO gone |
| Supabase Realtime without Phase 10 auth parity | **P0** | Nest Broadcast + private channels |
| Removing Redis without PG job durability | **P1** | Job table + claim + reconcile |
| Horizontal Nest scale without Redis adapter | **P1** | Single instance today; document limit |
| Missing separate worker bootstrap | **P2** | In-process works; fix script if splitting |
| Cost savings overstated vs rewrite cost | **P2** | Prefer Redis removal first |

---

## 16. GO / NO-GO Decision

### **GO WITH RAILWAY**

| Question | Answer |
|----------|--------|
| Can Vercel + Supabase alone replace everything today? | **NO** (Socket.IO + Nest long-lived process) |
| Can Redis be removed? | **YES** (with PG notification jobs) |
| Can Socket.IO be replaced later with Supabase Realtime? | **YES**, carefully, with Nest-authorized Broadcast preferred |
| Should Railway be removed in the first cost cut? | **NO** |

---

## Appendix — Inventory counts

| Area | Result |
|------|--------|
| Files inspected (primary) | `backend/src/main.ts`, `app.module.ts`, redis/*, notifications/*, realtime/*, prisma-unit-of-work, queue-engine, health, supabase/*, portal/Flutter realtime clients, package.json, DEPLOYMENT.md, ENV_SCHEMA.md |
| Redis references (operational) | Connection + BullMQ + health/admin (~8 core modules) |
| Socket.IO references | Gateway + services + 4 client apps + constants/tests |
| Railway dependencies in code | **0** (docs only) |
| Supabase dependencies | Prisma DB + thin admin health client |
| Recommended architecture | **Vercel + Supabase + Railway (no Redis)** |
| Infra savings | Drop Upstash (**LOW–VARIABLE**); keep Node host |
| Migration effort (first cut) | **24–60 hours** |
| Risks | See §15 |
| Decision | **GO WITH RAILWAY** |
| Exact next step | Stakeholder accept audit → design PG notification job table → implement behind flag on staging Nest |

---

*End of audit. No application code, infrastructure, or secrets were changed.*
