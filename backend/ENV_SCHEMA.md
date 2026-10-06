# Backend Environment Variable Schema

Strongly-typed contract for `backend/.env*`. Whichever framework is chosen must validate these at process startup and **exit immediately** if a required variable is missing or malformed — never fall back silently, especially in production.

| Key                     | Type    | Required          | Description                                              |
|-------------------------|---------|--------------------|------------------------------------------------------------|
| `NODE_ENV` / `APP_ENV`  | enum    | yes                | `development` \| `staging` \| `production`                 |
| `PORT`                  | int     | yes                | HTTP port to bind.                                          |
| `API_BASE_PATH`         | string  | no (default `/api`)| Base path prefix for all routes.                            |
| `DATABASE_URL`          | string  | yes                | PostgreSQL connection string, read by Prisma (`backend/prisma/schema.prisma`). Never log this value. |
| `SUPABASE_URL`          | string  | yes (if Supabase)  | Project API URL (`https://<ref>.supabase.co`). Used by `@supabase/server`. |
| `SUPABASE_PUBLISHABLE_KEY` | string | yes (if Supabase) | Publishable API key (`sb_publishable_…`). Client-safe; used for RLS-scoped clients. |
| `SUPABASE_SECRET_KEY`   | string  | yes (if Supabase)  | Secret API key (`sb_secret_…`). Server-only; never expose to clients. |
| `SUPABASE_JWKS_URL`     | string  | yes (if Supabase)  | JWKS endpoint for verifying Supabase Auth JWTs (`…/auth/v1/.well-known/jwks.json`). |
| `REDIS_URL`             | string  | yes (for notifications when `NOTIFICATION_QUEUE_DRIVER=redis`) | Managed Redis connection URL (`redis://` or `rediss://` for TLS, e.g. Upstash). BullMQ reads this only. |
| `NOTIFICATION_QUEUE_DRIVER` | enum | no (default `redis`) | `redis` (BullMQ) \| `postgres` (SKIP LOCKED jobs table). Default remains `redis` until staging validation. |
| `NOTIFICATION_PG_POLL_INTERVAL_MS` | int | no (default `1000`) | Postgres worker poll interval. |
| `NOTIFICATION_PG_LEASE_MS` | int | no (default `NOTIFICATION_STALE_PROCESSING_MS` or 300000) | Stale PROCESSING lease reclaim window. |
| `NOTIFICATION_PG_CLAIM_BATCH` | int | no (default `10`) | Max jobs claimed per poll cycle. |
| `REDIS_CONNECT_TIMEOUT_MS` | int | no (default `10000`) | TCP connect timeout for Redis. |
| `REDIS_COMMAND_TIMEOUT_MS` | int | no (default `15000`) | Per-command timeout for Redis. |
| `REDIS_RECONNECT_BASE_MS` | int | no (default `200`) | Initial reconnect delay (exponential backoff). |
| `REDIS_RECONNECT_MAX_MS` | int | no (default `30000`) | Maximum reconnect delay cap. |
| `REDIS_MAX_RECONNECT_ATTEMPTS` | int | no (default `50`) | Stop reconnecting after this many attempts. |
| `JWT_SECRET`            | string  | yes                | Signing secret for access tokens. Secret — CI-injected only.|
| `JWT_EXPIRY_SECONDS`    | int     | no (default 3600)  | Access token lifetime.                                       |
| `REFRESH_TOKEN_SECRET`  | string  | yes                | Signing secret for refresh tokens. Secret — CI-injected only.|
| `REFRESH_TOKEN_TTL_DAYS`| int     | no (default 30)    | Refresh token lifetime in days.                              |
| `EMAIL_VERIFICATION_REQUIRED` | bool | no (default false) | When true, login requires verified email.              |
| `FIREBASE_PROJECT_ID`   | string  | yes (if push used) | Must match the Flutter apps' Firebase project.               |
| `SENTRY_DSN`            | string  | no                  | Error-tracking sink; omit in `development`.                  |
| `CORS_ALLOWED_ORIGINS`  | csv     | yes                 | Comma-separated production origins. In `development`, any `localhost` / `127.0.0.1` origin is also allowed automatically (Flutter Web random ports). |
| `LOG_LEVEL`             | enum    | no (default `info`) | `debug` \| `info` \| `warn` \| `error`                        |
| `NOTIFICATION_QUEUE_ENABLED` | bool | no (default `true`) | Enable BullMQ notification dispatch. |
| `NOTIFICATION_USE_MOCK` | bool    | no (default `false`) | Use mock provider instead of WhatsApp/SMS. |
| `NOTIFICATION_WORKER_CONCURRENCY` | int | no (default `5`) | Parallel notification worker jobs. |
| `NOTIFICATION_MAX_ATTEMPTS` | int | no (default `5`) | Max delivery retries before DLQ. |
| `NOTIFICATION_BACKOFF_MS` | int | no (default `5000`) | Initial exponential backoff delay. |
| `WHATSAPP_ACCESS_TOKEN` | string | no | Meta WhatsApp Cloud API bearer token. |
| `WHATSAPP_PHONE_NUMBER_ID` | string | no | Meta WhatsApp phone number ID. |
| `WHATSAPP_TEMPLATE_LANG` | string | no (default `en`) | Language code for approved Meta templates. |
| `WHATSAPP_TEMPLATE_YOUR_TURN` | string | no | Approved template name for YOUR_TURN (required to send WA in prod). |
| `WHATSAPP_TEMPLATE_QUEUE_JOINED` | string | no | Approved template name for QUEUE_JOINED. |
| `WHATSAPP_TEMPLATE_POSITION_UPDATE` | string | no | Approved template name for POSITION_UPDATE. |
| `WHATSAPP_TEMPLATE_ALMOST_YOUR_TURN` | string | no | Approved template name for ALMOST_YOUR_TURN. |
| `WHATSAPP_TEMPLATE_QUEUE_CANCELLED` | string | no | Approved template name for QUEUE_CANCELLED. |
| `WHATSAPP_TEMPLATE_QUEUE_PAUSED` | string | no | Approved template name for QUEUE_PAUSED. |
| `WHATSAPP_TEMPLATE_QUEUE_RESUMED` | string | no | Approved template name for QUEUE_RESUMED. |
| `WHATSAPP_TEMPLATE_QUEUE_CLOSED` | string | no | Approved template name for QUEUE_CLOSED. |
| `WHATSAPP_TEMPLATE_FEEDBACK_REQUEST` | string | no | Approved template name for FEEDBACK_REQUEST. |
| `WHATSAPP_TEMPLATE_CUSTOM` | string | no | Approved template name for CUSTOM. |
| `SMS_HTTP_GATEWAY_URL` | string | no | HTTP endpoint for SMS delivery. |
| `CUSTOMER_PORTAL_URL` | string | no (default `http://localhost:3001`) | Base URL for feedback links in messages. |
| `NOTIFICATION_RECONCILE_INTERVAL_MS` | int | no (default `60000`) | Re-enqueue PENDING notifications after Redis recovery. |

## Rules

1. **Never hardcode secrets** in source, Dockerfiles, or committed `.env*` files. Committed files only ever contain placeholder values (e.g. `CHANGE_ME`) or genuinely non-secret defaults (e.g. `LOG_LEVEL=info`).
2. Production secrets (`JWT_SECRET`, `DATABASE_URL`, `REFRESH_TOKEN_SECRET`, ...) are injected by the CI/CD secret manager at deploy time, or via a gitignored `.env.local` for local development.
3. Any new variable added here must be added to this table in the same PR.

## Environment file loading

QueueFlow does **not** rely on Prisma's default `.env` auto-loading. All commands use npm scripts with explicit `dotenv-cli` file lists.

QueueFlow uses `dotenv-cli` **cascade mode** (`-c <environment>`), which loads files in order (later overrides earlier):

| `npm run …` | Cascade loads |
|-------------|----------------|
| `dev`, `prisma:*` (local) | `.env` → `.env.development` → `.env.local` → `.env.development.local` |
| `start:staging` | `.env` → `.env.staging` → `.env.local` → `.env.staging.local` |
| `start:prod`, `prisma:migrate:deploy:prod` | `.env` → `.env.production` → `.env.local` → `.env.production.local` |

In practice, **secrets live in `.env.local`** (gitignored); committed `.env.development` / `.env.staging` / `.env.production` hold non-secret defaults and placeholders.

**Setup:** copy `.env.example` → `.env.local` and fill in secrets. `.env.local` is gitignored.

**Never run `npx prisma …` directly.** Use `npm run prisma:migrate:deploy` (or the matching script). If `DATABASE_URL` is missing, Prisma wrapper scripts exit with:

```
❌ DATABASE_URL is not configured.
…
```

In CI/production, inject `DATABASE_URL` via the platform secret manager; `prisma:migrate:deploy:prod` loads `.env.production` for non-secret defaults.
