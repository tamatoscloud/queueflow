# Customer Portal — Components

## Layout

| Component | Path | Purpose |
|-----------|------|---------|
| `PageShell` | `components/layout/page-shell.tsx` | Max-width centered page container |
| `OfflineBanner` | `components/layout/offline-banner.tsx` | Sticky offline alert |
| `ServiceWorkerRegistration` | `components/layout/service-worker-registration.tsx` | Registers PWA service worker |

## Queue

| Component | Path | Purpose |
|-----------|------|---------|
| `BusinessHeader` | `components/queue/business-header.tsx` | Logo, business, branch, queue name |
| `QueueStatsGrid` | `components/queue/queue-stats-grid.tsx` | Waiting count, ETA, open/closed |
| `TokenDisplay` | `components/queue/token-display.tsx` | Prominent queue token |
| `LiveCountdown` | `components/queue/live-countdown.tsx` | Client-side countdown from snapshot time |
| `StatusBadge` | `components/queue/status-badge.tsx` | Entry or queue status pill |
| `StarRating` | `components/queue/star-rating.tsx` | Accessible 1–5 star input |
| `TrackQrSummary` | `components/queue/track-qr-summary.tsx` | QR code linking to track URL |

## Shared

| Component | Path | Purpose |
|-----------|------|---------|
| `LoadingState` | `components/shared/loading-state.tsx` | Skeleton loading placeholder |
| `ErrorState` | `components/shared/error-state.tsx` | Error message + retry |
| `EmptyState` | `components/shared/error-state.tsx` | Empty/neutral state |

## UI (shadcn-style)

| Component | Path |
|-----------|------|
| `Button` | `components/ui/button.tsx` |
| `Card` | `components/ui/card.tsx` |
| `Input` | `components/ui/input.tsx` |
| `Label` | `components/ui/label.tsx` |
| `Textarea` | `components/ui/textarea.tsx` |
| `Alert` | `components/ui/alert.tsx` |
| `Skeleton` | `components/ui/skeleton.tsx` |
| `RadioGroup` | `components/ui/radio-group.tsx` |

## Hooks

| Hook | Path | Purpose |
|------|------|---------|
| `useQueueLanding` | `hooks/use-queue-landing.ts` | Landing page query |
| `useEntryTracking` | `hooks/use-entry-tracking.ts` | Tracking with 15s poll |

## Lib

| Module | Path | Purpose |
|--------|------|---------|
| `customerApi` | `lib/api/customer-api.ts` | Public API client methods |
| `apiFetch` | `lib/api/client.ts` | Envelope-aware fetch wrapper |
| `joinQueueSchema` | `lib/schemas/forms.ts` | Zod validation for join form |
| `saveQueueSession` | `lib/storage/session.ts` | sessionStorage helpers |
| `queueRealtime` | `lib/realtime/queue-realtime.ts` | Polling adapter (Socket.IO ready) |
