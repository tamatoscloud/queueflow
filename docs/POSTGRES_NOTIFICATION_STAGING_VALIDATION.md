# PostgreSQL Notification Staging Validation

**Date:** 2026-08-12  
**Final decision:** **STAGING BLOCKED**

---

## 1. Staging environment identity

**NOT ESTABLISHED**

| Signal | Result |
|--------|--------|
| Dedicated Supabase QueueFlow staging | Not positively identified |
| Railway environment named staging | Not found — sole env is **`production`** |
| Backend URL | None verified |
| Documented hosts (`api.staging.queueflow.app`, etc.) | Not bound to a verified service |

## 2. Railway project

| Field | Result |
|-------|--------|
| Account | `tamatos.cloud@gmail.com` |
| Project | `Queueflow` |
| Environment | `production` only (ambiguous; not used as staging) |
| App secrets | MISSING (only `RAILWAY_*`) |
| Latest deploy | **FAILED** |
| Domains | none |
| Deploy of `e6aeebd` | **NOT PERFORMED** |

## 3. Supabase project

| Field | Result |
|-------|--------|
| Positively identified QueueFlow staging | **NO** |
| Unrelated MCP attendance project | **Rejected** |
| Org / project choice | Still required |

## 4. Deployed SHA

| Reference | Value |
|-----------|-------|
| `tamatos/main` | `e6aeebd26bc185bfe3f552306e92a8f6e0627baf` |
| Live staging | **NOT DEPLOYED** |

PostgreSQL queue code **is** on the deployable commit. Staging identity is the remaining blocker.

## 5. Migration status

**NOT RUN** — staging DB not confirmed.

Expected: `20260812190000_notification_jobs_postgres_queue`

## 6–15. Validation matrix

| Test | Status |
|------|--------|
| Redis baseline | NOT RUN |
| PostgreSQL queue | NOT RUN |
| Idempotency / retry / failure / concurrency / stale lock | NOT RUN |
| Tenant isolation / realtime / portal / TV / staff / business | NOT RUN |

## Remaining Redis dependencies

Keep Redis/BullMQ. Default driver remains `redis`. **Do not remove.**

## Exact next step

Operator must provision a **dedicated, positively named staging** Railway environment + confirmed QueueFlow Supabase staging project + app secrets, then re-run deployment of `e6aeebd` and this validation checklist.
