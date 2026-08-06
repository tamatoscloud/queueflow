# Environment Management

QueueFlow uses **explicit environment files** per application and environment. Never commit real secrets.

## Template files

| File | Purpose |
|------|---------|
| [`config/development.env.example`](../config/development.env.example) | All services — development defaults |
| [`config/staging.env.example`](../config/staging.env.example) | Staging placeholders |
| [`config/production.env.example`](../config/production.env.example) | Production placeholders |
| `backend/.env.example` | Backend-only quick reference |
| `backend/.env.local` | **Your backend secrets** (gitignored) |

## Backend

### Loading order

`dotenv-cli` cascade mode (`-c <environment>`):

| Command | Files loaded (later overrides earlier) |
|---------|----------------------------------------|
| `npm run dev` | `.env` → `.env.development` → `.env.local` → `.env.development.local` |
| `npm run start:staging` | `.env` → `.env.staging` → `.env.local` → `.env.staging.local` |
| `npm run start:prod` | `.env` → `.env.production` → `.env.local` → `.env.production.local` |

**Never run `npx prisma` directly.** Use `npm run prisma:*` scripts.

### Validation

The backend calls `validateEnvironment()` at startup (`backend/src/main.ts`). It fails fast when:

- Required variables are missing
- Placeholder values (`CHANGE_ME`, `YOUR_*`) are used in **production**
- `NOTIFICATION_USE_MOCK=true` in production

### Required variables (backend)

See [`backend/ENV_SCHEMA.md`](../backend/ENV_SCHEMA.md) for the full table.

Minimum for local development (in `.env.local`):

- `DATABASE_URL` — Supabase PostgreSQL connection string
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`
- `REDIS_URL` — local `redis://localhost:6379` or Upstash `rediss://`

### Database seed

```bash
SEED_DEMO_PASSWORD="your-local-only-password" npm run db:seed
```

There is **no default demo password**. Never set `SEED_DEMO_PASSWORD` in staging or production.

## Flutter apps

### Flavor → file → entrypoint

| Flavor | `.env.*` file | Entrypoint |
|--------|---------------|------------|
| `dev` | `.env.dev` | `lib/main_dev.dart` |
| `staging` | `.env.staging` | `lib/main_staging.dart` |
| `production` | `.env.production` | `lib/main_production.dart` |

### Flow

1. `main_<flavor>.dart` calls `bootstrap(Flavor.<flavor>)`
2. `bootstrap()` loads `.env.*` via `flutter_dotenv`
3. `AppConfig.fromEnvMap()` parses and **throws** on missing required keys
4. Optional `SENTRY_DSN` enables Sentry via `runWithObservability()`

### Required Flutter env keys

- `API_BASE_URL` — e.g. `http://localhost:3000/api/v1`
- `WS_BASE_URL` — e.g. `http://localhost:3000`
- `APP_NAME`

## Customer Portal (Next.js)

Copy `apps/customer-portal/.env.local.example` → `.env.local`:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_BASE_URL`
- `NEXT_PUBLIC_SENTRY_DSN` (optional)

## Observability

| Variable | Backend | Flutter | Customer Portal |
|----------|---------|---------|-----------------|
| `SENTRY_DSN` | ✅ | `SENTRY_DSN` in `.env.*` | `NEXT_PUBLIC_SENTRY_DSN` |
| `GIT_SHA` | ✅ health | — | — |
| `BUILD_NUMBER` | ✅ health | — | — |

## Secrets policy

1. Committed files contain **placeholders only**
2. Real secrets live in gitignored `*.local` files or CI secret managers
3. Production secrets injected at deploy time (GitHub Actions, Vercel, Railway, …)
4. Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` before public launch

## Infrastructure (no Docker)

| Service | Provider |
|---------|----------|
| PostgreSQL | Supabase |
| Redis | Upstash |
| Backend hosting | Node.js platform of choice |
| Frontends | Vercel / static CDN |

See [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Adding a new variable

1. Add to `backend/ENV_SCHEMA.md` (if backend)
2. Add to `packages/core` `EnvKeys` + `AppConfig` (if Flutter)
3. Add placeholder to all `config/*.env.example` files
4. Document in this file
