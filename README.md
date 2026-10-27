# QueueFlow

Multi-tenant **Digital Queue Management SaaS**. Businesses run queues at branches; customers join via QR code in their mobile browser — no app install required.

## Apps

| App | Path | Stack | Users |
|-----|------|-------|-------|
| **Backend API** | `backend/` | NestJS, Prisma, Queue Engine | All clients |
| **Customer Portal** | `apps/customer-portal/` | Next.js 15, TanStack Query | Customers (QR → join → track) |
| **Business App** | `apps/business_app/` | Flutter (web/mobile) | Owners and managers |
| **Staff App** | `apps/staff_app/` | Flutter (web) | Front-desk staff — fast queue console |
| **TV Display** | `apps/tv_display/` | Flutter Web | Lobby queue boards |
| **Admin Panel** | `apps/admin_panel/` | Flutter Web | Platform operators |
| **Marketing Website** | `apps/marketing_website/` | Flutter Web | Public (scaffold) |
| Customer App (unused) | `apps/customer_app/` | Flutter | Empty shell kept pending a product decision; guests use the portal |

See [`PROJECT.md`](PROJECT.md) for the full customer journey.

## Architecture

```
packages/          # Shared Dart packages (core, network, theme, ui, …)
apps/              # Flutter + Next.js applications
backend/           # NestJS REST API + Socket.IO + notification workers
docs/              # Architecture, API, deployment, environment (dated reports in docs/archive/)
config/            # Environment templates (no secrets)
```

- **Queue Engine** — DDD domain service (`backend/src/queue-engine/`) — do not modify without explicit approval
- **Multi-tenancy** — business-scoped data with RBAC
- **Realtime** — Socket.IO (`/realtime` namespace) — see [`docs/REALTIME.md`](docs/REALTIME.md)
- **Notifications** — BullMQ + Redis (Upstash) — see [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md)

Full architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Quick start

### Prerequisites

- Node.js 20+
- Flutter 3.38+
- Supabase PostgreSQL connection string
- Redis (local `redis-server` or Upstash)

### Backend

```bash
cd backend
cp .env.example .env.local          # fill DATABASE_URL, secrets
npm install
npm run prisma:migrate:deploy
SEED_DEMO_PASSWORD="your-local-password" npm run db:seed
npm run dev                         # http://localhost:3000
```

Swagger: http://localhost:3000/docs

### Restaurant client demo

For **Bella Vista Restaurant** presentation demo (QR join, live TV, Kanban console, simulator):

```bash
CUSTOMER_PORTAL_URL="http://localhost:3001" SEED_DEMO_PASSWORD="your-password" npm run db:seed
```

Full guide: [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) — client presentation script, credentials, QR URLs, and troubleshooting. Technical seed details: [`docs/DEMO_RESTAURANT.md`](docs/DEMO_RESTAURANT.md).

### Customer Portal

```bash
cd apps/customer-portal
cp .env.local.example .env.local
npm install
npm run dev                         # http://localhost:3001
```

### Flutter Apps

```bash
dart pub global activate melos
melos bootstrap

cd apps/business_app
flutter run -d chrome -t lib/main_dev.dart
```

Same pattern for `apps/tv_display` and `apps/admin_panel`.

## Development

| Command | Where | Purpose |
|---------|-------|---------|
| `npm run dev` | `backend/` | API + Socket.IO (watch mode) |
| `npm test` | `backend/` | 70+ unit/integration tests |
| `npm run typecheck` | `backend/` | TypeScript check |
| `npm run prisma:*` | `backend/` | Database migrations (never `npx prisma` directly) |
| `melos run analyze` | root | Flutter analyze all packages |
| `melos run test` | root | Flutter tests all apps |
| `npm run dev` | `apps/customer-portal/` | Next.js dev server |

Environment details: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)

## Testing

```bash
# Backend
cd backend && npm test

# Customer portal
cd apps/customer-portal && npm test

# Flutter (per app or workspace-wide)
cd apps/business_app && flutter test
melos run test
```

CI runs all of the above on every PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Deployment

QueueFlow uses **managed services**, not Docker:

- **Database** — Supabase PostgreSQL
- **Redis** — Upstash
- **CI/CD** — GitHub Actions
- **Hosting** — your choice (Vercel, Railway, static CDN, …)

Guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)  
Pre-release checklist: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)  
Readiness audit: [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md)

## Documentation

| Doc | Description |
|-----|-------------|
| [`PROJECT.md`](PROJECT.md) | Product flow and who each app serves |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Monorepo structure and decisions |
| [`docs/API.md`](docs/API.md) | REST API conventions |
| [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) | Prisma schema design |
| [`docs/QUEUE_ENGINE.md`](docs/QUEUE_ENGINE.md) | Queue Engine domain |
| [`docs/REALTIME.md`](docs/REALTIME.md) | Socket.IO events |
| [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md) | Notification platform |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Environment variables |
| [`docs/SETUP.md`](docs/SETUP.md) | Day-to-day dev commands |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | PR and code standards |

## Roadmap

| Status | Item |
|--------|------|
| ✅ Done | Core platform (API, queue engine, auth, realtime, notifications) |
| ✅ Done | Customer portal, business app, TV display, admin panel |
| ✅ Done | CI/CD pipeline, structured logging, Sentry hooks, health checks |
| 🔲 Next | Marketing website |
| 🔲 Next | Stripe billing integration |
| 🔲 Next | Automated E2E browser tests |
| 🔲 Next | Remove or repurpose `customer_app` scaffold |

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md). Use feature branches and ensure CI passes before opening a PR.

## License

UNLICENSED — private project.
