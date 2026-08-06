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
- **Notification worker** — separate process: `npm run worker:notifications`

### Health check

`GET /api/v1/health` — use for load balancer probes.

## Customer Portal (Next.js)

```bash
cd apps/customer-portal
npm ci
npm run build
npm run start
```

Deploy to **Vercel** (recommended) or any Node.js host.

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
