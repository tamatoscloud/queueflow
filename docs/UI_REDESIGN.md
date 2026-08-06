# QueueFlow UI Redesign

Frontend-only redesign across all six QueueFlow products. No backend, Queue Engine, auth, or notification workflow changes.

## Design system (`packages/theme`, `packages/ui`, `packages/widgets`)

| Addition | Purpose |
|----------|---------|
| `ProductIdentity` + `ProductTheme` extension | Per-product accent colors (customer, staff, owner, TV, admin, marketing) |
| `ProductThemeData` | Accent, gradient, and label per product surface |
| Existing tokens | `AppColors`, `AppGradients`, `AppTypography`, `AppSpacing`, `AppRadius`, `AppShadows` |

Customer portal uses parallel CSS tokens in `apps/customer-portal/src/app/globals.css`.

## 1. Customer QR Portal (Next.js PWA)

- **Wallet Pass** (`wallet-pass.tsx`) — Apple Wallet–style digital ticket on the live tracker
- Gradient header, perforated ticket body, position/ahead/wait stats
- Track page simplified: wallet pass is the primary visual; restaurant mode keeps progress ring + timeline

## 2. Staff experience (`business_app` — staff persona)

JWT role `STAFF` / non-owner routes to **Staff Shell** (Toast POS–inspired):

| Nav | Route | Purpose |
|-----|-------|---------|
| Today | `/today` | Today's queues, waiting counts, one-tap console |
| Queues | `/queues` | Queue list |
| Customers | `/customers` | Customer lookup |
| Tables | `/restaurant/tables` | Floor plan (demo) |
| Alerts | `/notifications` | Notification feed |

- Teal/cyan product accent via `ProductTheme(staff)`
- Large queue cards with **Open Console** CTA
- Realtime sync on staff home

## 3. Business Owner experience (`business_app` — owner persona)

JWT roles `OWNER` / `MANAGER` route to **Owner Shell** (Stripe/Linear–inspired):

| Nav | Route | Purpose |
|-----|-------|---------|
| Dashboard | `/dashboard` | Executive KPIs |
| Branches | `/branches` | Location management |
| Queues | `/queues` | Queue configuration |
| Reports | `/reports` | Analytics |
| QR Center | `/restaurant/qr` | QR placements |
| Staff | `/staff` | Staff management |
| Customers | `/customers` | CRM |
| Alerts | `/notifications` | Templates & history |
| Settings | `/settings` | Business settings |

- Simulator and table floor moved to drawer **Developer tools**
- `OWNER` badge in app bar
- Staff cannot access owner-only routes (branches, reports, staff, queue settings, simulator)

## 4. TV Display (`tv_display`)

Previously redesigned — airport-style board, confetti on call, dark mode, large typography.

## 5. Super Admin (`admin_panel`)

Previously redesigned — Stripe/Datadog-style shell with platform ops screens.

## 6. Marketing Website (`marketing_website`)

Full landing page (`landing_page.dart`):

- Hero with live queue mockup
- Features grid, how-it-works, pricing tiers
- Testimonials, FAQ, CTA, footer

## Routing & persona logic

- `apps/business_app/lib/core/persona/user_persona.dart` — role detection from JWT `roles[]`
- `AppShellResolver` — picks `StaffShell` vs `AppShell` (owner)
- GoRouter redirect: staff → `/today`, owner → `/dashboard`; blocks owner-only paths for staff

## Verification

```bash
# Flutter
cd apps/business_app && flutter analyze
cd apps/marketing_website && flutter analyze

# Customer portal
cd apps/customer-portal && npm test && npm run build
```
