# QueueFlow Staging Infrastructure Readiness

**Date:** 2026-08-12  
**Mode:** Infrastructure configuration — **NO deploy / NO migrate / NO Redis removal / NO driver switch**

---

## GitHub

| Field | Value |
|-------|-------|
| Account | `tamatoscloud` |
| Repo | `tamatoscloud/queueflow` |
| Branch | `main` |
| SHA | `e6aeebd26bc185bfe3f552306e92a8f6e0627baf` |
| Previous | `6971ebf3472db967e269defa5d381915b7c59f22` |
| Phase 0 | **PASS** |

---

## Supabase staging (confirmed)

| Field | Value |
|-------|-------|
| Organization | tamatoscloud's Org (`tocwfcchsbyknvyufvka`) |
| Project | `queueflow-staging` |
| Ref | `uxdpixtacsozltavuhnp` |
| Region | `eu-west-1` |
| Status | `ACTIVE_HEALTHY` |

---

## Railway

| Field | Value |
|-------|-------|
| Account | `tamatos.cloud@gmail.com` |
| Workspace | `tamatoscloud's Projects` |
| Project | `Queueflow` (`1b12e1a3-080d-47d7-860b-fa9e82a6a0a4`) |
| Environments | `production`, **`queueflow-staging`** |
| Staging service | `backend` (staging-only instance) |
| Production service | `Queueflow` (**untouched**) |
| Staging root/build/start/health | **configured** |
| Staging secrets (non-DB) | **partially set** |
| `DATABASE_URL` | **MISSING** — operator credential required |
| `REDIS_URL` | **MISSING** — Railway Redis available but not provisioned |
| Deployment | **NOT PERFORMED** |
| Status | **CONFIGURED — blocked on DB + Redis credentials** |

### Phase 1 pre-create report

```
RAILWAY ACCOUNT:        tamatos.cloud@gmail.com
RAILWAY PROJECT:        Queueflow
EXISTING ENVIRONMENTS:  production
AVAILABLE STAGING OPTION:
  CLI can create without browser:
  railway environment new queueflow-staging
  (optionally --duplicate production; currently duplicates almost nothing useful)
PRODUCTION ENVIRONMENT: production (DO NOT use as staging unless you explicitly confirm)
RECOMMENDED ACTION:     Create dedicated env `queueflow-staging`, then configure
                        Root Directory = backend, build/start commands, secrets,
                        generate Railway domain. Do NOT deploy until Supabase staging
                        + secrets exist.
```

**Not created in this audit** — awaiting your confirmation to run `railway environment new queueflow-staging`.

### Why previous deploy failed (diagnosis)

Observed service config at failure time:

- `rootDirectory`: **null** (monorepo root has **no** `package.json`)
- `buildCommand`: **null**
- `startCommand`: **null**
- builder: **RAILPACK**
- no `railway.toml` / `railway.json` / Dockerfile in repo
- no app secrets (`DATABASE_URL`, JWT, etc.)
- deploy triggered via `railway up` from repo root

Most probable failure: Railpack could not detect/build a Nest app at monorepo root, and/or process crashed immediately on missing env validation.

Exact log lines were not reliably retrievable in this session (CLI link/log stream issues); config evidence above is sufficient to block blind redeploy.

---

## Supabase

| Field | Value |
|-------|-------|
| Authenticated CLI orgs | `imantech`, `burqOra`, `buildbid` — **none are Tamatos** |
| Projects visible | two `sealiasad's Project` refs |
| `phgjkhmklyybvgnceqmm` | **REJECTED** — attendance/shift schema |
| `kqylyxmqikapppcbkllf` | **NOT confirmed** as QueueFlow |
| MCP `rmjirgsfikbnfoljeoag` | configured locally; **not verified** as QueueFlow staging |
| Status | **NO CONFIRMED TAMATOS SUPABASE STAGING PROJECT** |

### Database blocker

Create or authorize a Supabase org owned by Tamatos (`tamatoscloud` / `tamatos.cloud@gmail.com`), then create a project clearly named e.g. `queueflow-staging`, and provide:

- project name
- project ref
- region
- confirmation it is QueueFlow (empty or QueueFlow Prisma schema — not attendance)

Do **not** create under imantech / burqOra / buildbid by default.

---

## Vercel

| Field | Value |
|-------|-------|
| Account | `tamatoscloud` |
| Team | `queueflow` (Queueflow) |
| Project | `queueflow` → `https://queueflow-queueflow.vercel.app` |
| Status | Account/team **OK**; portal staging deploy **deferred** until API staging exists |

### Customer portal (`apps/customer-portal`)

| Item | Value |
|------|-------|
| Framework | Next.js 15 |
| Build | `next build` |
| Start | `next start` |
| Root directory | `apps/customer-portal` |
| Required public env | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_WS_URL` (optional: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_ENV`) |

Link (when ready, not run now):

```bash
npx vercel link --yes --scope queueflow --project queueflow
```

---

## Redis

| Field | Value |
|-------|-------|
| Required for baseline (default driver) | **Yes** if `NOTIFICATION_QUEUE_DRIVER=redis` |
| Current usage | BullMQ notification transport + Redis health probe only |
| Queue locks / Socket.IO adapter | **Not Redis** (Postgres `FOR UPDATE` / `SKIP LOCKED`; Nest `IoAdapter`) |
| Can eventually remove | **Yes**, after staging validates `NOTIFICATION_QUEUE_DRIVER=postgres` |
| Current driver | **`redis` (default)** — do not switch in this phase |

---

## Architecture conclusion (minimum cost, safe)

**Keep:** Vercel (portal) + Railway (Nest API + Socket.IO + in-process notification worker) + Supabase Postgres.

**Redis:** retain temporarily for baseline; eliminate after postgres queue validation (no Upstash needed once driver = postgres).

**Socket.IO:** requires long-lived Nest on Railway. Supabase Realtime is a **future** migration only — not immediate.

```
Vercel  → Customer Portal
Railway → NestJS (REST + Socket.IO + notification worker)
Supabase → PostgreSQL
Redis   → temporary (BullMQ) until postgres driver cutover
```

---

## Railway deployment configuration (repo)

| Item | Finding |
|------|---------|
| BUILD COMMAND | **Unset** in Railway; repo has no `railway.*`. Should be (from `backend/`): `npm ci && npx prisma generate && npm run build` |
| START COMMAND | **Unset**. Should be: `node dist/main.js` (`npm run start`) |
| WORKING DIRECTORY | Must be **`backend`** (root has no package.json) |
| NODE VERSION | `>=20` (`backend/package.json` engines) |
| PRISMA GENERATION | Required at build: `prisma generate` |
| DATABASE MIGRATION STRATEGY | Controlled separate step: `npx prisma migrate deploy` against **staging** DB only — never reset |
| HEALTH ENDPOINT | `GET /api/v1/health/live` (liveness), `GET /api/v1/health` (detailed) |
| GIT SHA SUPPORT | `GIT_SHA` / `GITHUB_SHA` via `getBuildMetadata()` |
| WORKER STRATEGY | In-process `NotificationWorker` on API boot; separate bootstrap file referenced by script is **missing** (OK — in-process is the real path) |

---

## Required staging variables (names only)

Railway `production` env today: all app vars **MISSING**.

From `env.validation.ts` + staging template:

### REQUIRED FOR STAGING
| Variable | Railway status |
|----------|----------------|
| `APP_ENV` | MISSING (must be `staging`) |
| `DATABASE_URL` | MISSING |
| `JWT_SECRET` | MISSING |
| `REFRESH_TOKEN_SECRET` | MISSING |
| `CORS_ALLOWED_ORIGINS` | MISSING |
| `SUPABASE_URL` | MISSING |
| `SUPABASE_SECRET_KEY` | MISSING |

### REDIS-RELATED
| Variable | Notes |
|----------|-------|
| `REDIS_URL` | Required while driver=`redis` |
| `NOTIFICATION_QUEUE_ENABLED` | optional (default on) |
| `NOTIFICATION_QUEUE_DRIVER` | leave unset/`redis` for baseline |

### SUPABASE-RELATED
| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | required non-dev |
| `SUPABASE_SECRET_KEY` | required non-dev |
| `SUPABASE_PUBLISHABLE_KEY` | template; not in hard validate |
| `SUPABASE_JWKS_URL` | template |

### JWT/AUTH
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `JWT_EXPIRY_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` |

### CORS
| `CORS_ALLOWED_ORIGINS` | use Vercel/Railway generated origins initially |

### NOTIFICATION
| `NOTIFICATION_USE_MOCK=false`, `NOTIFICATION_QUEUE_DRIVER=redis` (baseline) |

### GIT/BUILD
| `GIT_SHA=e6aeebd26bc185bfe3f552306e92a8f6e0627baf`, `BUILD_NUMBER`, `PORT` |

### OPTIONAL
| `SENTRY_DSN`, `LOG_LEVEL`, `NOTIFICATION_BACKOFF_MS`, poll/concurrency tunables |

---

## DNS

Documented hosts (`api.staging.queueflow.app`, etc.) **do not resolve**.

For initial staging: use **provider-generated** Railway + Vercel URLs only. Custom DNS later.

---

## Required operator actions

1. **Confirm Railway staging env creation** — reply to authorize:  
   `railway environment new queueflow-staging`  
   (Do **not** treat existing `production` as staging unless you explicitly say so.)
2. **Create Tamatos-owned Supabase staging project** (login as Tamatos on supabase.com; org + project named QueueFlow staging); send name/ref/region.
3. **Provide/inject secrets** into Railway staging only (never print into chat/git): `DATABASE_URL`, JWT pair, Supabase URL/secret, temporary `REDIS_URL`, `APP_ENV=staging`, `GIT_SHA`, CORS for generated portal URL.
4. After (1–3): set Railway service **Root Directory = `backend`**, build/start commands, generate domain, then authorize deploy of `e6aeebd` + migrate deploy on staging DB only.

---

## STOP status

**STAGING NOT READY TO DEPLOY**

Hard blockers: no dedicated Railway staging env; no confirmed Tamatos Supabase staging DB; app secrets missing; Railway service misconfigured for monorepo.
