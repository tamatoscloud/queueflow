# QueueFlow Customer Portal

Public Progressive Web App for customers who scan a venue QR code to join and track a queue.

## Stack

- Next.js 15 (App Router)
- TypeScript, Tailwind CSS, shadcn/ui-style components
- React Hook Form + Zod
- TanStack Query

## Quick start

```bash
cd apps/customer-portal
cp .env.local.example .env.local
npm install
npm run dev
```

Opens at **http://localhost:3001** (backend API expected at http://localhost:3000).

## Routes

| Path | Purpose |
|------|---------|
| `/q/[queueId]` | Queue landing |
| `/q/[queueId]/join` | Join form |
| `/q/[queueId]/success` | Confirmation |
| `/track/[entryId]` | Live tracking (15s refresh) |
| `/completed/[entryId]` | Thank you |
| `/feedback/[entryId]` | Rating & feedback |

See [docs/PAGES.md](./docs/PAGES.md) and [docs/COMPONENTS.md](./docs/COMPONENTS.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |

## PWA

Installable via manifest + service worker (`public/sw.js`). Offline fallback at `/offline`.

## Realtime

Tracking polls every 15 seconds. `src/lib/realtime/queue-realtime.ts` exposes a `QueueRealtimeAdapter` interface ready for Socket.IO.
