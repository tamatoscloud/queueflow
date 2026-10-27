# Phase 2G Wave 1 — Demo Readiness + UX Trust Pass

Implementation date: 2026-08-03  
Scope: Wave 1 only (customer trust/copy, completed experience, staff Today UX, TV error visibility, marketing CTAs/claims)

Reference audit: [PHASE_2G_UX_AUDIT.md](PHASE_2G_UX_AUDIT.md)

---

## 1. Problems found (Wave 1 targets)

| ID | Problem | Severity |
|----|---------|----------|
| C1 | Branch takeaway/drive pages showed "No public API yet" | P0 |
| C2 | Live tracking/help panels used hardcoded Bella Vista demo venue data | P0 |
| C3 | Join summary said "table is ready" for all service modes | P0 |
| C4 | Join screen used "parties waiting" for takeaway/drive-in | P0 |
| C5 | Completed page had placeholder stats, fake timeline, dine-in-only copy | P0 |
| C6 | Marketing CTAs were no-ops (`onPressed: () {}`) | P0 |
| C7 | Marketing claimed SSO (not implemented) | P0 |
| C8 | TV hid connection/stale state — board could look live while stale | P0 |
| C9 | Staff API failures appeared as "offline" | P0 |

---

## 2. Changes made

### Customer Portal

- **Service-mode copy centralization** — Extended `service-mode-config.ts` with join, waiting, completed, ended, and notification strings per `DINE_IN` / `TAKEAWAY` / `DRIVE_IN`.
- **Branch mode pages** (`branch-mode-page.tsx`) — Replaced technical API messaging with customer-friendly QR guidance.
- **Join flow** — `queue-summary.tsx`, `live-queue-status.tsx`, `queue-join-experience.tsx` use mode-aware labels; header shows business name.
- **Live tracking** — `waiting-experience.tsx` passes real business/branch names; `need-help.tsx`, `restaurant-info-panel.tsx`, `while-you-wait.tsx`, `notification-status.tsx` use neutral or API-backed copy.
- **Completed** — `visit-completed.tsx` rebuilt with real `EntryTracking` data (token, order/vehicle/party context, wait from timestamps). Removed fake reviews/timeline.
- **Terminal states** — `queue-ended.tsx` mode-aware titles/actions; `skipped` variant; no hardcoded phone.
- **Demo isolation** — `RESTAURANT_PHONE` and rich demo content only shown when `isRestaurantDemo()` (Bella Vista). Error pages no longer inject fake phone numbers.
- **Queue closed** — Call button only for explicit demo restaurants.

### Staff App

- **Today screen** (`today_screen.dart`) — Receptionist-first hierarchy: primary queue waiting count → Up Next → mode-specific Call Next CTA → walk-in / view queue. Service-mode overview demoted below primary actions.
- **Call Next labels** — `ServiceModeInfo.callNextActionLabel`: "Call next party/order/car".
- **Error vs offline** — `StaffLoadErrorState` and `StaffSessionExpiredState` replace mislabeled offline state on API/auth failures. True offline keeps "You're offline" copy.
- **Call Next sheet** — Mode-aware subtitle (order #, vehicle, party size) and complete action label (Seat / Collected / Serve).

### TV Display

- **Connection banner** (`display_screen.dart`) — Shows friendly states:
  - Connected: subtle green **Live** bar
  - Disconnected: **Connection lost · Updating automatically**
  - Stale data: **Queue information may be outdated** (from `lastError` or `lastUpdatedAt` threshold)

### Marketing Website

- **Functional CTAs** — Book demo / Get started open `mailto:hello@queueflow.app` with subject; See pricing scrolls to pricing section.
- **SSO removed** — Enterprise tier lists real capabilities (multi-branch, onboarding, priority support, branding).
- **Helpers** — `marketing_links.dart`, `open_external_link.dart` (web conditional import).

---

## 3. Screens affected

| App | Screens / components |
|-----|----------------------|
| Customer | Branch mode, join, track/waiting, completed, ended, queue closed, error states |
| Staff | Today, Call Next sheet, queue console (serviceMode param) |
| TV | Display board connection/stale banner |
| Marketing | Landing page (hero, pricing, CTA) |

---

## 4. Service-mode behavior

| Concept | Dine-in | Takeaway | Drive-in |
|---------|---------|----------|----------|
| Waiting label | parties | orders | cars |
| Call Next (staff) | Call next party | Call next order | Call next car |
| Complete action | Seat | Collected | Serve |
| Completed title | Thanks for dining with us | Order completed message | Visit complete message |
| Ended copy | Spot cancelled / session expired | Mode-specific via shared ended config | Same |

All customer-facing strings flow from `getServiceModeCopy()` unless demo-gated (`isRestaurantDemo`).

---

## 5. Backend gaps (unchanged — frontend-only Wave 1)

| Gap | Affected screen | Current API | Required | Why frontend cannot fix |
|-----|-----------------|-------------|----------|-------------------------|
| Branch takeaway/drive without `?queue=` | `/takeaway/[branchId]`, `/drive/[branchId]` | Queue landing by queue ID only | Branch + mode → default queue resolver | Cannot invent queue ID; shows QR guidance instead |
| Business phone on landing | Queue closed / help | Not in `QueueLanding` DTO | `business.phone` or `branch.phone` on portal landing | Cannot show real number without API field |
| POS order validation | Takeaway join | Join accepts metadata only | Order lookup endpoint | Cannot verify order numbers client-side |

No Queue Engine rules, schema, or fake APIs were added.

---

## 6. Tests

| Target | Command | Result |
|--------|---------|--------|
| Backend | `npm test`, `npm run typecheck`, `npm run build` | **76/76 pass**, build OK |
| Customer portal | `npm test`, `npm run typecheck`, `npm run build` | **27/27 pass**, build OK |
| Staff | `flutter analyze`, `flutter test`, `flutter build web` | **6/6 pass**, build OK |
| TV | `flutter analyze`, `flutter test`, `flutter build web` | **10/10 pass**, build OK |
| Business | `flutter analyze`, `flutter test`, `flutter build web` | **7/8 pass** (1 pre-existing golden/font failure), build OK |
| Admin (`admin_panel`) | `flutter analyze`, `flutter test`, `flutter build web -t lib/main_dev.dart` | **6/10 pass** (pre-existing golden + login copy tests), build OK |
| Marketing | `flutter analyze`, `flutter test`, `flutter build web -t lib/main_dev.dart` | **1/1 pass**, build OK |

Note: Flutter apps use flavor entrypoints (`main_dev.dart`), not `lib/main.dart`.

---

## 7. Manual demo results

Automated builds and unit/widget tests were run. **Full Bella Vista live E2E** (QR scan → join → staff call → complete across three modes) requires a running backend, Redis, and seeded Bella Vista data — recommended manual checklist:

- [ ] Dine-in: QR → join → track → staff call → ready → complete → feedback
- [ ] Takeaway: order join → track → order-ready copy → complete
- [ ] Drive-in: vehicle join → track → drive-in ready copy → complete
- [ ] Staff Today: waiting count, Up Next, Call Next label per mode, API error ≠ offline
- [ ] TV: Live bar, reconnect banner, stale warning
- [ ] Marketing: every CTA opens mailto or scrolls to pricing

---

## 8. Remaining Phase 2G Wave 2 items

From audit — **not in Wave 1**:

- Owner dashboard: demote developer tools prominence (P1)
- Admin mobile nav: expose all 12 destinations (P1)
- Reports: remove misleading placeholder states (P1)
- Customer `layout.tsx` `maximumScale: 1` accessibility (P1)
- Playwright E2E suite (Wave 3)
- `DEMO_RUNBOOK.md` (Wave 3)
- Backend: branch-mode queue resolver, business phone on landing API

---

## Regression status

- Queue Engine: **no changes**
- Realtime: **no protocol changes**; TV banner reads existing provider state
- Design system: **reused** GlassPanel, AppButton, service-mode helpers, theme tokens
