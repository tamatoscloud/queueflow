# QueueFlow Backend API

NestJS application layer over Prisma + the Queue Engine.

## Environment setup

QueueFlow loads env files **explicitly via npm scripts** — never rely on Prisma's default `.env` loading.

| File | Purpose |
|------|---------|
| `.env.example` | Template — copy to `.env.local` |
| `.env.development` | Committed dev defaults (non-secret) |
| `.env.staging` | Staging template |
| `.env.production` | Production template |
| `.env.local` | **Your secrets** (gitignored) |

**Local development** uses `dotenv -c development`, which loads `.env` → `.env.development` → `.env.local` (later files override).

```bash
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL, Supabase keys, JWT secrets, …
```

## Run

```bash
cd backend
npm install
npm run prisma:migrate:deploy   # NOT npx prisma — see below
npm run dev                     # http://localhost:3000
```

- OpenAPI: [http://localhost:3000/docs](http://localhost:3000/docs)
- Health: `GET /api/v1/health`
- All routes are versioned under `/api/v1/...`
- Responses use a standard envelope: `{ success, data, meta?, requestId }`

### npm scripts (official interface)

| Script | Loads | Use |
|--------|-------|-----|
| `npm run dev` | `.env.development` + `.env.local` | Local API server |
| `npm run start:prod` | `.env.production` | Production server |
| `npm run start:staging` | `.env.staging` | Staging server |
| `npm run prisma:migrate:deploy` | dev + local | Apply migrations locally |
| `npm run prisma:migrate:deploy:prod` | `.env.production` | Apply migrations in prod/CI |
| `npm run prisma:migrate:dev` | dev + local | Create migrations |
| `npm run prisma:generate` | dev + local | Regenerate Prisma client |
| `npm run prisma:studio` | dev + local | DB browser |
| `npm run prisma:seed` | dev + local | Seed data |
| `npm run db:check` | dev + local | Test DB connectivity |

> **Never run `npx prisma …` directly.** Prisma only auto-loads `.env`, which does not contain `DATABASE_URL`. Always use the `npm run prisma:*` scripts so the correct env files are loaded and a clear error is shown if `DATABASE_URL` is missing.

## Architecture

```
controllers  →  application services  →  QueueEngineService / Prisma
                      │
                      └── ports (repos, EventBus, Clock, OperatingHours)
                               ▲
                               └── Prisma adapters (infrastructure)
```

Feature modules: `business`, `branch`, `queue`, `queue-operations`,
`customer`, `notification`, `feedback`, `reports`, `platform-admin`.

## Tests

```bash
npm test              # unit + HTTP integration (in-memory engine, no DB)
npm run typecheck
```

See also: [`ENV_SCHEMA.md`](ENV_SCHEMA.md), [`docs/QUEUE_ENGINE.md`](../docs/QUEUE_ENGINE.md), [`docs/API.md`](../docs/API.md).
