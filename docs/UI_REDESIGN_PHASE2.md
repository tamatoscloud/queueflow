# QueueFlow UI Redesign — Phase 2

Frontend-only. No backend, API, Queue Engine, auth, notification, or realtime changes.

## Design system additions

| Token / component | Package | Purpose |
|-------------------|---------|---------|
| `AppMotion` | `packages/theme` | 300ms transitions, spring curves, counter duration |
| `GlassPanel` | `packages/ui` | Glassmorphism floating panels |
| `AnimatedCounter` | `packages/widgets` | KPI / position count-up |
| `ScoreRing` | `packages/widgets` | Queue health / business score rings |

Customer portal CSS: confetti, float blobs, noise texture in `globals.css`.

## 1. Customer QR Portal (priority)

**Waiting Experience** (`waiting-experience.tsx`) — centerpiece screen:

- Hero restaurant image with gradient overlay
- Live status pill
- Wallet pass ticket
- Animated position counter
- Progress ring (restaurant mode)
- Celebration / almost-ready banners
- Journey timeline + countdown
- Tips & offers while waiting
- Need help / leave queue actions
- CSS confetti on `CALLED` status

Track page refactored to use `WaitingExperience` exclusively.

## 2. Staff App (NEW — `apps/staff_app`)

Separate Flutter app for receptionists (Toast POS speed):

| Screen | Route | Notes |
|--------|-------|-------|
| Today | `/` | Glass panels, animated waiting count, Call Next FAB |
| Customers | `/customers` | Search |
| Alerts | `/notifications` | Feed |
| Profile | `/profile` | Staff identity + settings |
| Queue Console | `/queues/:id/console` | Full ops (call, skip, hold, etc.) |

Teal staff product theme. Reuses business API client + realtime from shared packages.

## 3. Business Owner App (`business_app`)

**Executive Dashboard Header** — Stripe-style overview:

- Greeting + queue health score ring
- Animated waiting / avg wait hero stats
- Served today + no-shows metrics
- Animated peak-hour heat map (from daily summary)
- Contextual insight recommendations

Owner shell unchanged from Phase 1; dashboard is the Phase 2 focus.

## 4. Super Admin (`admin_panel`)

Existing Stripe/Vercel-style shell from Phase 1. Platform KPI dashboard with charts retained.

## 5. TV Display

Extended `DisplayThemePreset`:

- `luxury`, `minimal`, `kids`, `holiday` (+ existing dark/light/brand)
- Cinematic gradient backdrops per preset

## 6. Marketing Website

Phase 1 landing retained; Phase 2 adds animated blob backgrounds via `PageShell` patterns.

## CI

Flutter matrix now includes: `business_app`, `staff_app`, `admin_panel`, `tv_display`, `marketing_website`.

## Run locally

```bash
# Customer portal
cd apps/customer-portal && npm run dev

# Staff app
cd apps/staff_app && flutter run -t lib/main_dev.dart

# Owner app
cd apps/business_app && flutter run -t lib/main_dev.dart
```

## Demo credentials

See `docs/DEMO_RESTAURANT.md` — Bella Vista owner/staff accounts.
