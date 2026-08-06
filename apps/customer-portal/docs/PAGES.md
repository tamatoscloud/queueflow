# Customer Portal — Pages

Public customer experience opened after scanning a venue QR code. No authentication.

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Explains QR scan flow; entry when no deep link |
| `/q/[queueId]` | Queue Landing | Business/branch/queue info, live stats, Join CTA |
| `/q/[queueId]/join` | Join Form | Customer details + notification preference |
| `/q/[queueId]/success` | Success | Token, position, ETA, track QR, Track CTA |
| `/track/[entryId]` | Live Tracking | Position, countdown, 15s auto-refresh |
| `/completed/[entryId]` | Completed | Thank you + feedback CTA |
| `/feedback/[entryId]` | Feedback | Star rating + optional comment |
| `/offline` | Offline fallback | Shown when network unavailable (PWA) |

## Data flow

```
QR scan → /q/:queueId
       → Join form → POST /api/v1/queues/:queueId/join
       → Success (sessionStorage + query params)
       → /track/:entryId (poll GET /customer-portal/entries/:id/tracking)
       → COMPLETED → /completed/:entryId → /feedback/:entryId
```

## API dependencies

- `GET /customer-portal/queues/:queueId` — landing
- `POST /queues/:queueId/join` — join
- `GET /customer-portal/entries/:entryId/tracking` — tracking
- `POST /customer-portal/feedback` — feedback

## State

- **Session** (`sessionStorage`): `entryId`, `queueId`, `displayCode`, `joinedAt` after join
- **TanStack Query**: server state with stale/refetch for landing and tracking

## Realtime

Tracking uses **Socket.IO** (`/realtime` namespace) with HTTP polling fallback when disconnected. See repo root `docs/REALTIME.md`.

## PWA

- `src/app/manifest.ts` — web app manifest
- `public/sw.js` — offline shell + navigate fallback to `/offline`
- `OfflineBanner` — inline offline indicator

## Environment

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

Run dev server on port **3001** (`npm run dev`) to avoid conflicting with the NestJS API on 3000.
