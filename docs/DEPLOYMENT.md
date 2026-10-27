# QueueFlow — Deployment Guide

QueueFlow deploys to managed cloud services. **No Docker required.**

## Architecture overview

```
                    ┌─────────────────────────────────────┐
                    │           GitHub Actions CI          │
                    │  backend · flutter web · portal      │
                    └─────────────────┬───────────────────┘
                                      │ deploy
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  Backend API                   Customer Portal              Flutter Web Apps
  (Node.js)                     (Next.js)                    business · admin · tv
        │                             │                             │
        ├──────── Supabase PostgreSQL ┤                             │
        ├──────── Upstash Redis ──────┤                             │
        └──────── Socket.IO ──────────┴─────────────────────────────┘
```

## Prerequisites

- Supabase project (PostgreSQL + optional Auth)
- Upstash Redis instance (`rediss://` URL)
- Domain names + TLS certificates
- Sentry project (recommended)
- WhatsApp/SMS provider credentials (production notifications)

## Backend

### Build

```bash
cd backend
npm ci
npx prisma generate
npm run build
```

### Migrate

```bash
# Staging / production — inject DATABASE_URL via CI secrets
npm run prisma:migrate:deploy:prod
```

### Environment

Copy [`config/production.env.example`](../config/production.env.example) and inject all `CHANGE_ME` values via your platform secret manager. See [`ENVIRONMENT.md`](ENVIRONMENT.md).

### Hosting options

- **Railway / Render / Fly.io** — run `node dist/main.js` with `npm run start:prod`
- **Notification worker** — runs inside the API process (`NotificationWorker`, started on boot when the queue is enabled); no separate service is needed

### Health check

- **Load balancer / Railway liveness:** `GET /api/v1/health/live` (in-process only, no dependency I/O)
- **Detailed ops check:** `GET /api/v1/health` (DB + Redis + Supabase + queue; may be `degraded`)

See [`LATENCY_BUDGET.md`](LATENCY_BUDGET.md) for p95 targets.

### Speed: put the API and database in one region

Every staff action and guest poll makes one or more database round trips, and transactions (join, call next) make several in a row. The API now logs the measured round trip at boot:

```
Database round trip: 180 ms (median of 3) — high for a co-located database; check that the API and database regions match
```

Anything above ~20 ms means the API and Supabase sit in different regions. Move them together, as close to your guests as you can (for Pakistan-based venues, Railway `asia-southeast1` with Supabase `ap-southeast-1`, Singapore). Then:

- Point `DATABASE_URL` at Supabase's **transaction pooler** (port `6543`) with `?pgbouncer=true&connection_limit=10`, and keep the session/direct URL for migrations.
- Turn off Railway App Sleeping for the API service, so the first request of the day doesn't pay a cold start.
- Read `Server-Timing: app;dur=…` in browser devtools: it is server time only, so a slow request with a small `app` value is network distance, not code.

### Proxy and scaling settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRUST_PROXY_HOPS` | `1` | Proxies in front of the API (Railway edge = 1). Required for per-client rate limits. |
| `THROTTLE_STORAGE` | `memory` | `redis` shares rate-limit counters across replicas (needs `REDIS_URL`). |
| `SOCKET_IO_REDIS_ADAPTER` | unset | `true` relays Socket.IO rooms through Redis so the API can run more than one replica (needs `REDIS_URL`). |

Run a single API replica unless both Redis options are on.

## Customer Portal (Next.js)

```bash
cd apps/customer-portal
npm ci
npm run build
npm run start
```

Deploy to **Vercel** (recommended) or any Node.js host.

**Demo / preview deploys:** when GitHub → Vercel shows `Deployment was blocked` (git author protection), use the CLI path from [`VERCEL_DEPLOY_RUNBOOK.md`](VERCEL_DEPLOY_RUNBOOK.md). Always deploy from `apps/customer-portal` (not the monorepo root). Public demo host: `https://queueflow-six-beta.vercel.app`.

Required env vars:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_BASE_URL`
- `NEXT_PUBLIC_SENTRY_DSN` (optional)

## Flutter Web Apps

Build each app:

```bash
cd apps/business_app   # or admin_panel, tv_display
flutter pub get
flutter build web --release -t lib/main_production.dart
```

Deploy `build/web/` to static hosting (Firebase Hosting, Cloudflare Pages, S3+CloudFront).

| App | Suggested subdomain |
|-----|---------------------|
| Business app | `app.queueflow.app` |
| Admin panel | `admin.queueflow.app` (restrict access) |
| TV display | `tv.queueflow.app` or branch-local |

## CORS

Set `CORS_ALLOWED_ORIGINS` on the backend to include every deployed frontend origin.

## Redis

Use Upstash with TLS (`rediss://`). Set `REDIS_URL` on the backend and notification worker.

## Supabase

- Run Prisma migrations against the Supabase connection string (session pooler recommended for NestJS).
- Store `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and JWKS URL in backend secrets.

## CI/CD

GitHub Actions workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

On merge to `main`, configure deployment jobs for your hosting targets (not included — platform-specific).

## Rollback

1. Revert the git commit / redeploy previous artifact
2. If a migration was applied, run a forward-fix migration — never `migrate reset` in production
3. Verify `/api/v1/health` and smoke tests (see [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md))
