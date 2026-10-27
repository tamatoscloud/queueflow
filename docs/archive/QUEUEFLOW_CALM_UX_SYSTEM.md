# QueueFlow — Calm Premium UX System

**Status:** Design system + redesign map (audit complete)  
**Date:** August 2026  
**Scope:** Full ecosystem UI/UX — frontend only  
**North star:** *QueueFlow should reduce stress, not add to it.*

---

## 1. Executive summary

QueueFlow serves five distinct personas under operational pressure. The ecosystem already has a shared design foundation (`packages/theme`, `packages/ui`, `packages/widgets`, `ProductIdentity`, `ProductTheme`) and Phase 2 screens across all apps. However, visual language is **inconsistent** across products:

| Product | Current state | Calm UX gap |
|---------|---------------|-------------|
| **Customer portal** | Light booking UI partially restored (`booking-shell`, `light-*`); dark premium components still exist in codebase | Emotional reassurance strong in light screens; completed/feedback/branch routes still mixed |
| **Staff app** | Dedicated `staff_app` with Today + Call Next; teal accent | Still reads like mini-dashboard (WAITING hero, glass panels, dual CTAs) vs. receptionist POS |
| **Business owner** | Executive dashboard, QR center, 9 nav items + developer tools | Developer tools visible; triple queue surfacing; analytics language leaks |
| **Admin panel** | 12 destinations, command palette partial | Generic SaaS gray; weak `ProductIdentity`; mobile nav hides 7 routes |
| **TV display** | Cinematic presets, realtime board | Technical errors hidden; typography not yet “10m readable” spec |
| **Marketing** | Editorial landing with wired CTAs (post–2G) | Still gradient-SaaS in places; not yet full hospitality editorial |

**This document is the source of truth** for the Calm Premium redesign. Extend existing tokens — do not create a parallel design system.

---

## 2. Design principles

### 2.1 Core philosophy

Every screen must answer in **≤2 seconds**:

1. **Where am I?**
2. **What is happening?**
3. **What needs my attention?**
4. **What should I do next?**

If any answer is unclear → redesign the screen.

### 2.2 Calm premium attributes

| Attribute | Meaning in QueueFlow |
|-----------|---------------------|
| **Calm** | Generous whitespace, soft surfaces, no visual shouting during rush |
| **Clear** | One dominant action, plain language, large numbers |
| **Fast** | ≤300ms interactions; staff actions in one tap |
| **Reassuring** | “We’ve got you” copy; honest loading/offline states |
| **Obvious** | Primary CTA visually unmistakable |
| **Hospitality-first** | Party / order / car — never “entry” or “KPI” to customers |
| **Premium** | Editorial typography, refined color, subtle motion |
| **Colorful** | Lavender, violet, peach accents — playful, not childish |
| **Human** | Friendly errors, forgiving undo paths |
| **Forgiving** | Confirm only destructive actions; easy recovery |

### 2.3 Information hierarchy (all apps)

```
1. What is happening?     ← largest, top
2. What needs attention?  ← highlighted surface
3. What should I do?      ← primary CTA
4. Everything else        ← progressive disclosure
```

### 2.4 What we never show end users

- API errors, HTTP codes, JWT, SocketException, stack traces
- “Token” (prefer “Your number” / display code in context)
- Developer terminology (KPI, snapshot, metadata)

Translate to human language: *“We couldn’t load the queue.”* + **[Try again]**

---

## 3. Personas & personality

Same brand. Different personality.

| Persona | App | Personality | Primary device |
|---------|-----|-------------|----------------|
| **Customer** | `customer-portal` | Emotional, playful, reassuring | Mobile (one hand) |
| **Staff** | `staff_app` | Fast, calm, operational, minimal | Phone → tablet |
| **Owner** | `business_app` (owner shell) | Confident, insightful, premium | Desktop → tablet |
| **Super Admin** | `admin_panel` | Controlled, professional, clear | Desktop |
| **Public** | `tv_display` | Simple, huge, readable at distance | Large display |
| **Prospect** | `marketing_website` | Editorial, aspirational, premium | Desktop + mobile |

### 3.1 Customer

**Mindset:** “Don’t worry. We’ve got you.”

- Large typography, clear numbers, emotional reassurance
- One primary CTA per screen
- No dashboards, tabs, or dense tables

| Instead of | Prefer |
|------------|--------|
| Queue Position: 7 | **You're #7** |
| Estimated Service Time | **About 25 min** |
| Queue Status: ACTIVE | **You're in! We'll keep you updated.** |

**Reference:** Customer waiting screen (warm white, serif headlines, lavender accents, hourglass/bell illustrations, stat cards).

### 3.2 Staff (highest priority)

**Mindset:** “I don’t have to think.”

Staff are **not** software users. They operate during lunch rush, phones ringing, 20+ waiting.

**Today screen ideal structure:**

```
GOOD MORNING, JONATHAN          ● LIVE

27 waiting

NEXT UP
Alex Smith · Party of 4 · Dine-in

[ CALL NEXT ]                    ← huge, thumb-reachable, persistent

────────────────────────────────
Dine-in      18 waiting
Takeaway      6 orders
Drive-in      3 cars
────────────────────────────────
Recent activity…
```

**Rules:**

- **CALL NEXT** is never buried in navigation
- No charts on operational home
- One hand, one thumb, minimal thinking
- Feels like: Toast POS + Apple + premium hospitality — but simpler

### 3.3 Business owner

**Mindset:** “I understand my business.”

```
GOOD AFTERNOON, SARAH

Bella Vista is running smoothly.

[ 12 Waiting ]  [ ~18 min Avg Wait ]  [ 84 Served Today ]

Service performance
Dine-in    42 served
Takeaway   31 orders
Drive-in   18 cars

Attention: Takeaway wait time is increasing.
[ View queue ]
```

- Real data only — never invent metrics
- Developer tools → **Settings → Developer tools**
- Navigation: Dashboard, Queues, Staff, QR Center, Reports, Branches, Settings

### 3.4 Super admin

- Calm tables, progressive disclosure
- `Healthy` not `REDIS_CONNECTION=OK`
- Command palette (Cmd+K) for power users
- Retain QueueFlow branding — not generic dark SaaS

### 3.5 TV display

- **NOW SERVING** / **NEXT** — enormous type
- No technical errors on screen
- Service-mode-aware labels
- Calm transitions (~300ms)

### 3.6 Marketing

- Editorial serif heroes, soft gradients, hospitality photography
- Avoid: generic AI-SaaS dashboard aesthetic

---

## 4. Visual language (extracted from customer reference)

### 4.1 Color tokens — Calm Premium extension

Extend `packages/theme/lib/src/tokens/app_colors.dart` and mirror in `customer-portal/src/app/globals.css`. **Do not replace** existing semantic colors — add calm-surface aliases.

| Token | Hex | Usage |
|-------|-----|-------|
| `calmBackground` | `#FFFCF9` | Warm ivory page background |
| `calmSurface` | `#FFFFFF` | Cards, inputs |
| `calmSurfaceLilac` | `#F5F3FF` | Notification cards, stat tiles |
| `calmSurfacePeach` | `#FDE8D8` | Illustration circles (hourglass, bell) |
| `calmInk` | `#0F0F0F` | Primary text — strong black |
| `calmInkMuted` | `#6B7280` | Secondary text |
| `calmViolet` | `#8B7CF8` | Primary accent (buttons, highlights) |
| `calmVioletDeep` | `#7C3AED` | Pressed / emphasis |
| `calmLavender` | `#EDE9FE` | Soft fills, borders |
| `calmPeach` | `#FDBA74` | Warm accent (sparingly) |
| `calmMint` | `#D1FAE5` | Success surfaces (sparingly) |

**Existing tokens remain** for Flutter apps until migrated screen-by-screen:

- `AppColors.primary` (`#6366F1`) → owner/admin primary
- `AppColors.accentPurple` (`#A855F7`) → customer identity
- `ProductIdentity.staff` teal → shift toward **calm violet + mint operational accents** in staff redesign (keep distinguishable from customer)

### 4.2 Typography

**Two personalities — add to theme, apply per persona:**

| Role | Flutter | Customer portal (CSS) | Used for |
|------|---------|----------------------|----------|
| **Display** | `Playfair Display` or `Libre Baskerville` via `google_fonts` | `--font-display` (Playfair) | Hero headings, major numbers, emotional moments |
| **Body** | `Inter` (existing `AppTypography`) | `--font-geist-sans` / Inter | Labels, buttons, forms, ops UI |

**Hierarchy rules:**

- Display headlines: 28–36px mobile, 40–48px desktop
- Hero numbers (position, waiting count): display font, weight 700
- Labels: sans, 11–12px uppercase tracking for ops; sentence case for customer
- Minimum body: **16px** on customer mobile (accessibility)

**Action:** Add `AppTypography.displayFamily` to `packages/theme` — do not fork per app.

### 4.3 Spacing (`AppSpacing` — unchanged scale)

| Token | Value | Calm UX usage |
|-------|-------|---------------|
| `xs` | 4 | Icon gaps |
| `sm` | 8 | Tight groups |
| `md` | 16 | Card padding mobile |
| `lg` | 24 | Section gaps |
| `xl` | 32 | Screen padding |
| `xxl` | 48 | Hero breathing room |

**Rule:** When in doubt, add space. Calm beats dense.

### 4.4 Radius

| Element | Radius |
|---------|--------|
| Pills / primary buttons | `radius-full` (9999px) |
| Cards | 16–24px (`AppRadius.lg` / `xl`) |
| Inputs (customer) | Full pill |
| Inputs (staff) | 12–16px — faster recognition |

### 4.5 Shadows & borders

- Prefer **soft borders** (`calmLavender` / `neutral-200`) over heavy shadows on light surfaces
- Shadow: `0 4px 16px rgba(15,15,15,0.06)` max on customer cards
- Staff: flatter — speed over depth

### 4.6 Buttons

| Variant | Customer | Staff | Owner/Admin |
|---------|----------|-------|-------------|
| **Primary** | Full-width pill, violet, 56px height | Full-width, 56–64px, high contrast | 44–48px, indigo/violet |
| **Secondary** | Lilac outline / ghost | Neutral outline | Ghost |
| **Destructive** | Red, confirmation sheet | Red, confirmation dialog | Red, confirm |

**Staff primary:** Only one per viewport. Label = action: `Call Next`, `Seat`, `Mark no-show`.

### 4.7 Cards

| Component | Package | Calm usage |
|-----------|---------|------------|
| `GlassPanel` | `packages/ui` | Owner dashboard, marketing — reduce on staff Today |
| `AppCard` | `packages/ui` | Default elevated surface |
| Stat card (customer) | Portal `light-*` | Lilac fill + one violet highlight column |
| `MetricCard` | `packages/widgets` | Owner KPIs — max 3–4 per row |
| `StaffQueueEntryCard` | `staff_app` | Large touch, inline actions on detail only |

### 4.8 Status indicators

| State | Color | Copy pattern |
|-------|-------|--------------|
| Live | Green dot | `Live` |
| Reconnecting | Amber pulse | `Reconnecting…` |
| Updating (poll) | Neutral | `Updating…` |
| Paused | Amber | `Queue paused` |
| Closed | Neutral | `We're not taking guests right now` |

Use `RealtimeStatusChip` / `formatConnectionLabel` — never fake “Live” when disconnected.

### 4.9 Motion (`AppMotion`)

| Context | Duration | Curve |
|---------|----------|-------|
| Button press | 150ms | `easeOut` |
| Page / sheet | 300ms | `easeInOut` |
| Position counter | 800ms | `AnimatedCounter` |
| TV token change | 300ms | fade + slide |
| Staff call confirm | 200ms | scale pulse |

**Never:** bouncing loaders, parallax on ops screens, animations >500ms on staff actions.

### 4.10 Accessibility

- Customer: allow pinch-zoom (remove `maximumScale: 1` lock)
- Touch targets: **48×48dp** minimum (staff: 56dp for primary)
- Contrast: WCAG AA on all text
- `aria-live` on waiting/ready screens (already on light ready)
- Respect `prefers-reduced-motion`

---

## 5. Service mode terminology

Centralize in:

- Flutter: `service_mode_helpers.dart` (staff), `service_mode_config.ts` (customer)
- New: `packages/theme` or `packages/domain` — `ServiceModeCopy` interface shared conceptually

| Concept | DINE_IN | TAKEAWAY | DRIVE_IN |
|---------|---------|----------|----------|
| Unit | party / parties | order / orders | car / cars |
| Waiting | parties waiting | orders waiting | cars waiting |
| Ready | Your table is ready | Ready for pickup | We're coming to your car |
| Seat action | Seat | Hand over / Collect | Serve |
| Call next | Call next party | Call next order | Call next car |
| Size label | Party size | Items | Guests in car |

**Never** use dine-in copy for takeaway/drive-in.

---

## 6. Navigation architecture

### Customer — no complex nav

| Route | Screen | CTA |
|-------|--------|-----|
| `/q/[queueId]` | Join / booking | Confirm |
| `/track/[entryId]` | Waiting / ready | — (passive) |
| `/completed/[entryId]` | Thank you | Rate visit |
| `/feedback/[entryId]` | Feedback | Submit |

### Staff — bottom nav

| Tab | Route |
|-----|-------|
| Today | `/` |
| Customers | `/customers` |
| Alerts | `/notifications` |
| Profile | `/settings` |

Queue console: pushed from Today — not a tab.

### Owner — shell (consolidate)

| Primary | Route |
|---------|-------|
| Dashboard | `/dashboard` |
| Queues | `/queues` |
| Staff | `/staff` |
| QR Center | `/restaurant/qr` |
| Reports | `/reports` |
| Settings | `/settings` |

Branches + Customers + Alerts → secondary (drawer / settings sections).

### Admin

| Primary | Route |
|---------|-------|
| Overview | `/dashboard` |
| Businesses | `/tenants` |
| Alerts | `/notifications` |
| Support | `/support` |
| More | drawer → rest |

---

## 7. Ecosystem audit — current inventory

### 7.1 Applications

| App | Stack | Key paths |
|-----|-------|-----------|
| `customer-portal` | Next.js 15, Tailwind | `src/app/`, `src/components/customer/` |
| `staff_app` | Flutter | `lib/features/today/`, `lib/shared/widgets/staff/` |
| `business_app` | Flutter | `lib/features/dashboard/`, `lib/features/shell/` |
| `admin_panel` | Flutter | `lib/features/shell/admin_shell.dart` |
| `tv_display` | Flutter | `lib/features/display/` |
| `marketing_website` | Flutter | `lib/features/landing/` |

Legacy: `customer_app` (Flutter) — superseded by portal; do not invest.

### 7.2 Shared design system

| Package | Exports | Calm UX action |
|---------|---------|----------------|
| `packages/theme` | `AppColors`, `AppTypography`, `AppSpacing`, `AppMotion`, `ProductTheme`, `ProductIdentity` | Add calm tokens + display font |
| `packages/ui` | `AppButton`, `AppCard`, `GlassPanel`, `AppBadge`, `AppTextField` | Add `CalmCard`, `CalmPrimaryButton` variants |
| `packages/widgets` | `AnimatedCounter`, `ScoreRing`, `MetricCard`, `EmptyStateView`, `PageLoading` | Extend empty states with calm copy |

### 7.3 Customer portal — screen map

| Route | Current implementation | Target calm state |
|-------|---------------------|-------------------|
| `/q/[queueId]` | `BookingShell` + `BookingRegistration` ✅ | Refine — venue-first header |
| `/q/[queueId]/join` | Same as landing | Redirect or keep alias |
| `/track/[entryId]` | `LightWaitingExperience` / `LightReadyExperience` ✅ | Add `AnimatedCounter`, progress ring |
| `/completed/[entryId]` | `visit-completed.tsx` (dark) | Light shell + mode-aware copy |
| `/feedback/[entryId]` | `feedback-experience.tsx` | Light shell |
| `/takeaway`, `/drive` branch | `branch-mode-page` → `ModeLanding` (dark) | Light booking flow |
| Dark components | `waiting-experience.tsx`, `queue-join-experience.tsx`, `mode-landing.tsx` | Deprecate after migration |

### 7.4 Staff app — screen map

| Screen | File | Gap vs calm spec |
|--------|------|------------------|
| Today | `today_screen.dart` | Glass analytics hero; inline Call Next not sticky; dual queue CTAs |
| Call next sheet | `call_next_sheet.dart` | Good foundation — enlarge actions, mode copy |
| Queue console | `queue_console_screen.dart` | Tablet split good; phone needs bigger cards |
| Customers | `customers_screen.dart` | OK — enlarge search |
| Alerts | `notifications_screen.dart` | Fix deep-link to console |
| Break mode | `break_mode_provider.dart` | OK |

### 7.5 Owner app — screen map

| Screen | Gap |
|--------|-----|
| Dashboard | Simulator/Console in quick actions; triple queue surfacing |
| QR Center | Download = copy URL; branchId in preview |
| Reports | Period tabs show same data |
| Staff | Stub copy mentions API |
| Shell | Developer destinations in drawer |

### 7.6 Admin — screen map

| Gap |
|-----|
| `ProductIdentity.platformAdmin` → gray neutral, not calm branded |
| Mobile: 5 of 12 routes in bottom nav |
| Dense list cards vs tables for operators |

### 7.7 TV — screen map

| Gap |
|-----|
| `lastError` not shown to operator (intentionally hidden from public — show in settings overlay only) |
| Theme presets not in setup UI |
| Typography good but not yet audited at 10m |

### 7.8 Marketing

| Gap |
|-----|
| Hero still mesh-gradient SaaS in places |
| Needs editorial serif headline treatment per calm spec |

---

## 8. Duplicate & inconsistent components

| Issue | Locations | Resolution |
|-------|-----------|------------|
| **Dual customer themes** | `light/*` vs `waiting/*`, `join/*`, `mode-landing` | Migrate all routes to `light/*`; archive dark |
| **Dual staff homes** | `staff_app` Today vs `business_app` `/today` | `staff_app` is canonical; business staff shell legacy |
| **ProductIdentity staff = teal** | Conflicts with violet customer reference | Staff → calm violet primary, mint secondary for “live” |
| **CSS vs Dart tokens** | `globals.css` vs `AppColors` | Document mapping table; codegen or manual sync on token changes |
| **AnimatedCounter** | Dart `packages/widgets` + portal `animated-counter.tsx` | Keep separate; align duration to `AppMotion.counter` |
| **Service mode copy** | `service-mode-config.ts` vs `service_mode_helpers.dart` | Keep language aligned via this doc §5 |
| **Error components** | `PremiumError`, `StaffLoadErrorState`, `EmptyStateView` | Unified copy guidelines §2.4 |

---

## 9. Error, loading, offline patterns

### Loading

- Never blank — use skeletons (`LoadingState`, `PageLoading`, `AppSkeleton`)
- Customer: soft lilac skeleton shapes on warm white
- Staff: single message max — `Loading today's queue…`

### Offline

- Customer: `OfflineBanner` + honest copy
- Staff: `StaffOfflineState` with cached hint
- Never show “Live” when polling-only — use `Updating…`

### Errors (human copy)

| Context | Message | Action |
|---------|---------|--------|
| Queue load fail | We couldn't load the queue. | Try again |
| Join fail | We couldn't add you to the queue. | Try again |
| Tracking fail | We're having trouble updating your place. | Try again |
| Staff action fail | We couldn't update [Name]'s status. | Try again |
| Session expired | Your session ended. | Sign in |

---

## 10. Responsive rules

| App | Primary | Secondary | Rule |
|-----|---------|-----------|------|
| Customer | 375px phone | Tablet | Single column; sticky footer CTA |
| Staff | Phone portrait | Tablet landscape | Today: sticky bottom Call Next on phone |
| Owner | 1280px desktop | Tablet | KPI grid 3-col → 1-col |
| Admin | Desktop | Phone | Tables → cards on mobile |
| TV | 1920×1080 landscape | — | Scale type by viewport width |

---

## 11. Redesign map & implementation priority

### Phase 0 — Foundation (this document + tokens) ✅

- [x] Ecosystem audit
- [x] `QUEUEFLOW_CALM_UX_SYSTEM.md`
- [ ] Add `calm*` tokens to `packages/theme`
- [ ] Add `AppTypography.displayTextTheme`
- [ ] CSS token sync in `customer-portal/globals.css`
- [ ] `CalmButton` / `CalmStatCard` in `packages/ui` (optional aliases)

### Phase 1 — Staff app (P0 — highest pressure)

| # | Task | Files |
|---|------|-------|
| 1.1 | Redesign Today: waiting count → next up → sticky **Call Next** | `today_screen.dart` |
| 1.2 | Service mode queue breakdown cards (dine/takeaway/drive) | `today_screen.dart` |
| 1.3 | Remove glass analytics hero; demote avg wait to secondary | `today_screen.dart` |
| 1.4 | Sticky bottom Call Next on phone | `today_screen.dart`, `staff_shell.dart` |
| 1.5 | Enlarge call next sheet actions (Seat, Hold, No show) | `call_next_sheet.dart` |
| 1.6 | Mode-aware copy in sheet | `call_next_sheet.dart`, `service_mode_helpers.dart` |
| 1.7 | Fix error vs offline conflation | `today_screen.dart` |
| 1.8 | Alerts → deep link to queue console | `notifications_screen.dart` |
| 1.9 | Apply calm surfaces + violet staff accent | `staff_app/lib/app.dart`, theme |
| 1.10 | Tests + `flutter analyze` + `flutter build web` | `test/staff_ux_test.dart` |

**Today success test:** Receptionist can call next in **one tap** without scrolling.

### Phase 2 — Customer portal (P1)

| # | Task | Files |
|---|------|-------|
| 2.1 | Migrate `/completed`, `/feedback` to `BookingShell` | `completed/`, `feedback/` |
| 2.2 | Migrate branch takeaway/drive to light booking | `branch-mode-page.tsx` |
| 2.3 | Venue-first branding (business name in header) | `booking-shell.tsx` |
| 2.4 | `AnimatedCounter` on position + wait | `light-waiting-experience.tsx` |
| 2.5 | Mode-aware copy audit (ended, welcome, completed) | `service-mode-config.ts` |
| 2.6 | Remove demo content from non-demo tenants | `restaurant-content.ts` |
| 2.7 | Deprecate dark components | `waiting-experience.tsx`, etc. |
| 2.8 | Tests + build | `light-experience.test.tsx`, Playwright |

### Phase 3 — Business owner (P2)

| # | Task | Files |
|---|------|-------|
| 3.1 | Dashboard: calm executive header, max 3 KPIs above fold | `executive_dashboard_header.dart` |
| 3.2 | Remove Simulator/Console from primary quick actions | `dashboard_screen.dart`, `owner_quick_actions.dart` |
| 3.3 | Gate developer tools under Settings | `app_shell.dart` |
| 3.4 | Service performance plain language | `service_performance_panel.dart` |
| 3.5 | QR Center: fix download + display names | `qr_center_screen.dart` |
| 3.6 | Consolidate nav (see §6) | `app_shell.dart` |

### Phase 4 — Super admin (P3)

| # | Task | Files |
|---|------|-------|
| 4.1 | Apply `ProductIdentity.platformAdmin` with calm surfaces | `admin_panel/lib/app.dart` |
| 4.2 | Mobile “More” overflow menu | `admin_shell.dart` |
| 4.3 | Editorial headings on dashboard | `dashboard_screen.dart` |
| 4.4 | Debounced search | `admin_widgets.dart` |
| 4.5 | Progressive disclosure for health details | `health_screen.dart` |

### Phase 5 — TV display (P4)

| # | Task | Files |
|---|------|-------|
| 5.1 | NOW SERVING / NEXT typographic scale pass | `display_screen.dart` |
| 5.2 | Operator-only error overlay (not public) | `display_board_provider.dart` |
| 5.3 | Theme preset picker in setup | `setup_screens.dart` |
| 5.4 | Service mode labels on board | `display_screen.dart` |

### Phase 6 — Marketing (P5)

| # | Task | Files |
|---|------|-------|
| 6.1 | Editorial hero (serif, hospitality imagery) | `landing_page.dart` |
| 6.2 | Calm premium color pass | `landing_page.dart` |
| 6.3 | Verify all CTAs wired | `marketing_links.dart` |

---

## 12. Testing gates (per phase)

Before marking any phase complete:

```bash
# Customer portal
cd apps/customer-portal && npm test && npm run build

# Staff
cd apps/staff_app && flutter analyze && flutter test && flutter build web

# Owner
cd apps/business_app && flutter analyze && flutter test && flutter build web

# Admin
cd apps/admin_panel && flutter analyze && flutter test

# TV
cd apps/tv_display && flutter analyze && flutter test
```

**Must not break:** APIs, auth, RBAC, Socket.IO, polling fallback, service modes, QR flows, routing, Sentry.

---

## 13. Success criteria

| Persona | Passes when… |
|---------|--------------|
| Customer | “I know exactly where I am and what happens next.” |
| Staff | “I don't have to think.” — Call Next in one tap |
| Owner | “I can see what's happening.” — real metrics, plain language |
| Admin | “I can control the platform.” — calm, not chaotic |
| Client demo | “This feels like a real commercial product.” |

**Ultimate principle:**

> Beautiful enough to impress.  
> Simple enough to operate under pressure.  
> Calm enough to reduce stress.

---

## 14. Related documents

| Doc | Purpose |
|-----|---------|
| `docs/PHASE_2G_UX_AUDIT.md` | Detailed issue inventory (P0–P3) |
| `docs/STAFF_UX_REDESIGN.md` | Staff Phase 2D baseline |
| `docs/OWNER_UX_REDESIGN.md` | Owner Phase 2D baseline |
| `docs/UI_REDESIGN_PHASE2.md` | Phase 2 component map |
| `apps/customer-portal/docs/PAGES.md` | Customer route reference |

---

## 15. Next action

**Begin Phase 1 — Staff Today screen redesign** per §11 Phase 1 table. Do not batch-rewrite all apps. Ship staff Today first, validate with demo script (`docs/DEMO_RUNBOOK.md`), then proceed to customer portal Phase 2.
