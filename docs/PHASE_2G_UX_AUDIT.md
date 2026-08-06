# Phase 2G — Full Ecosystem UX Audit

**Date:** August 2026  
**Scope:** Customer Portal, Staff App, Business Owner App, TV Display, Admin Panel, Marketing Website, shared design system  
**Phase 2F baseline:** All three service modes (DINE_IN, TAKEAWAY, DRIVE_IN) are functionally complete end-to-end.  
**Audit rule:** No code changes were made to produce this document.

---

## Executive summary

QueueFlow has a **strong visual foundation** and **working cross-app flows**, but it is **not yet client-demo bulletproof** without explanation. The main gaps are:

1. **Customer-facing technical language** (API references, “token”, platform branding)
2. **Demo data leaking into production paths** (hardcoded Bella Vista content on live screens)
3. **Incomplete service-mode copy** on join, completed, and ended screens
4. **Staff Today screen** still reads like a mini dashboard rather than a receptionist POS
5. **Owner app** mixes executive, operational, and developer tools on one surface
6. **Admin mobile navigation** hides 7 of 12 destinations behind the drawer
7. **Marketing website** has non-functional CTAs and unverified enterprise claims
8. **No Playwright E2E** exists yet
9. **TV display** does not surface API errors to operators

**Production readiness score (UX): 6.5 / 10**  
Builds pass; the product **can** be demoed today with Bella Vista seed, but a non-technical restaurant client will hit confusing copy, dead ends, or internal language without a guided walkthrough.

---

## Audit methodology

Each major screen was evaluated against:

| Criterion | Question |
|-----------|----------|
| Clarity | Can a non-technical user understand it in 2–3 seconds? |
| Primary action | Is the main CTA obvious? |
| Hierarchy | Is information ordered by importance? |
| States | Loading, empty, error, offline, reconnecting — polished and honest? |
| Terminology | Consistent, hospitality-oriented, no developer language? |
| Service mode | Dine-in / takeaway / drive-in respected where applicable? |
| Responsive | Works at mobile, tablet, desktop breakpoints? |
| Design system | Uses shared tokens/components appropriately? |
| Realtime honesty | Never appears “live” when disconnected? |

---

## Application inventory

### Customer Portal (`apps/customer-portal`)

| Route | Screen | Key files |
|-------|--------|-----------|
| `/` | Home / QR explainer | `src/app/page.tsx` |
| `/q/[queueId]` | Mode landing | `mode-landing.tsx`, `restaurant-landing.tsx`, `takeaway-landing.tsx`, `drive-in-landing.tsx` |
| `/takeaway/[branchId]` | Branch takeaway | `branch-mode-page.tsx` |
| `/drive/[branchId]` | Branch drive-in | `branch-mode-page.tsx` |
| `/q/[queueId]/join` | Join | `queue-join-experience.tsx`, join subcomponents |
| `/q/[queueId]/success` | Success redirect | `success-content.tsx` |
| `/track/[entryId]` | Waiting / ready / ended | `waiting-experience.tsx`, `table-ready-experience.tsx`, `queue-ended.tsx` |
| `/completed/[entryId]` | Thank you | `visit-completed.tsx` |
| `/feedback/[entryId]` | Rating | `feedback-experience.tsx` |
| `/offline` | PWA offline | `src/app/offline/page.tsx` |
| Global | Shell, banners | `layout.tsx`, `page-shell.tsx`, `offline-banner.tsx`, `realtime-status-banner.tsx` |

### Staff App (`apps/staff_app`)

| Screen | Key files |
|--------|-----------|
| Today (home) | `features/today/today_screen.dart` |
| Queue console | `features/queue_console/presentation/queue_console_screen.dart` |
| Call next sheet | `shared/widgets/staff/call_next_sheet.dart` |
| Entry cards | `shared/widgets/staff/staff_queue_entry_card.dart` |
| Customers | `features/customers/presentation/customers_screen.dart` |
| Alerts | `features/notifications/presentation/notifications_screen.dart` |
| Profile / Settings | `profile_screen.dart`, `settings_screen.dart` |
| Shell | `features/shell/staff_shell.dart` |

### Business Owner App (`apps/business_app`)

| Screen | Key files |
|--------|-----------|
| Dashboard | `features/dashboard/presentation/dashboard_screen.dart` |
| Executive header | `widgets/executive_dashboard_header.dart` |
| Live activity | `widgets/live_queue_activity_panel.dart` |
| Service performance | `widgets/service_performance_panel.dart` |
| Quick actions | `widgets/owner_quick_actions.dart` |
| QR Center | `features/restaurant_demo/presentation/qr_center_screen.dart` |
| Reports | `features/reports/presentation/reports_screen.dart` |
| Branches / Staff / Queues | respective `*_screen.dart` |
| Shell | `features/shell/presentation/app_shell.dart` |

### TV Display (`apps/tv_display`)

| Screen | Key files |
|--------|-----------|
| Board | `features/display/presentation/display_screen.dart` |
| Setup / settings | `features/setup/presentation/setup_screens.dart` |
| Provider | `features/display/providers/display_board_provider.dart` |

### Admin Panel (`apps/admin_panel`)

| Screen | Key files |
|--------|-----------|
| Shell / nav | `features/shell/admin_shell.dart` |
| Dashboard | `features/dashboard/dashboard_screen.dart` |
| Tenants, Users, Branches | respective screens |
| Health, Analytics, Audit, Support, Feature Flags | respective screens |
| Shared widgets | `shared/widgets/admin_widgets.dart` |

### Marketing Website (`apps/marketing_website`)

| Screen | Key files |
|--------|-----------|
| Landing (single page) | `features/landing/presentation/landing_page.dart` |

### Design system

| Package | Key files |
|---------|-----------|
| `packages/theme` | `app_colors.dart`, `app_typography.dart`, `product_identities.dart`, `app_theme.dart` |
| `packages/ui` | `AppButton`, `AppCard`, `AppBadge`, etc. |
| `packages/widgets` | `MetricCard`, `EmptyStateView`, `PageLoading`, etc. |

---

## Critical issues (P0) — fix before client demo

| # | Issue | App | Impact |
|---|-------|-----|--------|
| C1 | **“No public API yet”** exposed to customers on branch takeaway/drive pages | Customer | Destroys trust; reads as unfinished product |
| C2 | **Demo venue data** (phone, address, hours, specials) hardcoded on live tracking/help panels via `restaurant-content.ts` | Customer | Wrong info for any non-demo tenant |
| C3 | **Join summary says “table is ready”** for all modes | Customer | Takeaway/drive-in users get dine-in copy |
| C4 | **Live queue status always says “parties waiting”** | Customer | Wrong units for takeaway (orders) and drive-in (cars) |
| C5 | **Completed page shows placeholder data** (party 2, wait 0, code “—”) and dine-in-only timeline | Customer | Broken end-of-journey experience |
| C6 | **Marketing CTAs are no-ops** (`onPressed: () {}`) | Marketing | Cannot convert visitors; looks unfinished |
| C7 | **Marketing claims SSO** without product implementation | Marketing | Misleading for enterprise prospects |
| C8 | **TV `lastError` never shown** — stale board with no explanation | TV | Public screen may show wrong data silently |
| C9 | **Staff API failures render as “offline”** on Today | Staff | Masks real errors; staff cannot diagnose |

**Files (P0):**

- `apps/customer-portal/src/components/customer/branch-mode-page.tsx`
- `apps/customer-portal/src/lib/demo/restaurant-content.ts`
- `apps/customer-portal/src/components/customer/join/queue-summary.tsx`
- `apps/customer-portal/src/components/customer/join/live-queue-status.tsx`
- `apps/customer-portal/src/components/customer/visit-completed.tsx`
- `apps/customer-portal/src/app/completed/[entryId]/page.tsx`
- `apps/customer-portal/src/components/customer/waiting/restaurant-info-panel.tsx`
- `apps/customer-portal/src/components/customer/waiting/need-help.tsx`
- `apps/marketing_website/lib/features/landing/presentation/landing_page.dart`
- `apps/tv_display/lib/features/display/presentation/display_screen.dart`
- `apps/staff_app/lib/features/today/today_screen.dart`

---

## High priority issues (P1)

### Customer Portal

| Issue | Files |
|-------|-------|
| “QueueFlow” branding on join header instead of venue name | `queue-join-experience.tsx` |
| `NotificationStatus` claims “Updates enabled” without real push flow | `notification-status.tsx` |
| `WelcomeOverlay` dine-in only (“You're on the list!”) | `welcome-overlay.tsx` |
| `queue-ended.tsx` dine-in language for all modes; SKIPPED → “expired” copy | `queue-ended.tsx` |
| Waiting screen very long; duplicate token; technical footer connection copy | `waiting-experience.tsx` |
| `WhileYouWait` dead `#` links | `while-you-wait.tsx` |
| Closed/paused queue shows disabled button, not dedicated state | `restaurant-landing.tsx`, landings |
| `maximumScale: 1` blocks pinch-zoom (accessibility) | `app/layout.tsx` |
| Returning customer blocked from new join — no “join as someone else” | `queue-join-experience.tsx` |
| No back navigation from join to landing | `queue-join-experience.tsx` |

### Staff App

| Issue | Files |
|-------|-------|
| Today mixes analytics hero (“WAITING”, avg wait) with Call Next — receptionist-first violated | `today_screen.dart` |
| Dual Call Next targets (floating + per-mode) can confuse which queue is called | `today_screen.dart` |
| Call next sheet always says “Party of X” | `call_next_sheet.dart` |
| Alerts “View queue” deep-links to Today, not console | `notifications_screen.dart` |
| Empty queue “Add customer” opens console instead of walk-in dialog | `staff_empty_states.dart` |
| Login shows API diagnostics in production builds | `login_screen.dart` |
| Duplicate `RealtimeStatusChip` on Today | `today_screen.dart`, `staff_shell.dart` |

### Business Owner App

| Issue | Files |
|-------|-------|
| Dashboard promotes Simulator + Queue Console beside QR Center | `dashboard_screen.dart` |
| Reports Daily/Weekly/Monthly tabs show same data | `reports_screen.dart` |
| Staff screen stub: “loads from invitations API” | `staff_screen.dart` |
| Mobile nav hides Staff, Customers, Alerts, Settings in drawer | `app_shell.dart` |
| “Developer tools” exposed in owner drawer | `app_shell.dart` |
| Service performance uses “Joined / Completed” analytics language | `service_performance_panel.dart` |
| QR “Download” copies URL; preview shows truncated `branchId` | `qr_center_screen.dart` |
| Triple queue surfacing on dashboard (live panel + quick actions + list) | `dashboard_screen.dart` |

### Admin Panel

| Issue | Files |
|-------|-------|
| Mobile bottom nav shows only 5 of 12 destinations | `admin_shell.dart` |
| Search fires only on Enter — no live filter | `admin_widgets.dart` |
| No data tables — list cards only for dense operator work | tenants, users, audit screens |
| `ProductIdentity.platformAdmin` not applied — weak persona differentiation | `app.dart` |
| Dark mode incomplete (`AdminEmptyHint` hardcoded light surface) | `admin_widgets.dart` |

### TV Display

| Issue | Files |
|-------|-------|
| Theme presets (luxury, kids, holiday, minimal) not exposed in setup/settings | `setup_screens.dart`, `display_screen.dart` |
| Settings gear uses dark colors in light mode | `display_screen.dart` |
| No “last updated” when polling fallback active | `display_board_provider.dart` |
| `EmptyStateView` light gradient on dark TV backdrop | `packages/widgets` |

### Marketing

| Issue | Files |
|-------|-------|
| No header nav / footer; “See pricing” doesn’t scroll to `#pricing` | `landing_page.dart` |
| Hardcoded `$49` / `$149` without billing backend | `landing_page.dart` |
| Thin FAQ; minimal social proof | `landing_page.dart` |

### Cross-cutting

| Issue | Files |
|-------|-------|
| `ProductIdentity` wired only in staff + business apps | `product_identities.dart`, other `app.dart` files |
| No Playwright E2E suite | *(not yet created)* |
| Demo runbook exists (`DEMO_RESTAURANT.md`) but not full ecosystem script | `docs/DEMO_RESTAURANT.md` |

---

## Medium priority issues (P2)

| Area | Issue |
|------|-------|
| Customer | Drive-in landing “waiter assigned” card misleading pre-join |
| Customer | Takeaway CTA “Track my order” goes to join form |
| Customer | Ready state has no “I'm here” acknowledgment CTA |
| Customer | Feedback “Grazie!” inconsistent with English UI |
| Customer | Legacy components (`SuccessCelebration`, `JoinWizard`, `TableReadyScreen`) drift from active flow |
| Staff | ALL-CAPS section labels feel enterprise-heavy |
| Staff | Transfer dialog “Transfer to queue” |
| Owner | Peak-hours chart decorative bar heights |
| Owner | Branch delete without confirmation |
| Admin | Raw `generatedAt` timestamp in dashboard badge |
| TV | `requestTvFullscreen()` is no-op |
| TV | Raw hex colors in theme presets vs token policy |
| Marketing | Single-page only — no privacy, terms, contact |
| Design | `AppBadge` neutral variant weak on dark surfaces |
| Design | Google Fonts runtime dependency on TV/web (offline flash risk) |
| Realtime | Customer has triple realtime UX (banner + indicator + footer) — redundant |

---

## Low priority polish (P3)

| Area | Issue |
|------|-------|
| Customer | Generic loading skeleton on all routes |
| Customer | `TicketSkeleton` unused on track page |
| Customer | Party size row tight on 320px widths |
| Customer | Region-specific phone placeholder `03XX` |
| Staff | Emoji in empty states |
| Owner | `restaurant_demo` path naming leaks internally |
| Admin | Settings screen read-only |
| TV | Confetti/blink may be excessive in quiet venues |
| Marketing | Logo strip is text labels, not logos |
| Docs | `docs/PAGES.md` describes success screen users never see |

---

## What’s already good (preserve)

### Customer Portal
- Mode routing via `ModeLanding` and `service-mode-config.ts`
- Rich waiting experience (hero, ladder, wallet, journey, almost-your-turn)
- Mode-aware ready state (`table-ready-experience.tsx`)
- Sticky join CTA, friendly API errors, session resume
- Premium error/empty states with retry + call restaurant

### Staff App
- Purpose-built 4-tab shell; Call Next sheet with Seat / No show / Hold
- Mode-aware entry cards (order #, vehicle, party)
- Dedicated paused / closed / offline states
- Break mode; tablet console with timeline

### Business Owner App
- Persona resolver (owner vs staff chrome)
- QR Center (mode tabs, posters, copy/share/print)
- Executive header with real KPIs; service performance panel structure
- Skeleton loaders; realtime + polling fallback

### TV Display
- TV type scale; four layout modes; font scale slider
- Strong “NOW SERVING” hierarchy; call feedback (confetti, glow, sound)
- Realtime + polling; connection banner with reconnect count

### Admin Panel
- Responsive shell (rail ≥1200px, drawer on mobile)
- Consistent admin widget patterns; dashboard KPIs + health badges
- Login split layout; users role filter; tenant detail actions

### Design system
- Solid token layer (colors, typography, spacing, motion)
- `AppTheme` light/dark; `ProductIdentity` per product
- Broad adoption across Flutter apps

---

## Service mode consistency matrix (post–2F)

| Stage | Dine-in | Takeaway | Drive-in |
|-------|---------|----------|----------|
| Landing | ✅ Strong | ✅ Good | ⚠️ Pre-join waiter card |
| Join | ⚠️ Summary copy | ⚠️ Summary + parties | ⚠️ Party size shown |
| Tracking | ✅ Strong | ✅ Strong | ✅ Strong |
| Ready | ✅ | ✅ | ✅ |
| Ended | ❌ Dine-in copy | ❌ Dine-in copy | ❌ Dine-in copy |
| Completed | ❌ Not mode-aware | ❌ Not mode-aware | ❌ Not mode-aware |
| Feedback | ⚠️ Generic | ⚠️ Generic | ⚠️ Generic |

---

## Realtime UX audit

| App | Indicator | States | Honest when disconnected? |
|-----|-----------|--------|---------------------------|
| Customer | `RealtimeIndicator`, banner, footer | Live / Reconnecting / Updating | ✅ Mostly — footer can feel technical |
| Staff | `RealtimeStatusChip` | Live / Reconnecting / Updating | ✅ |
| Owner | `RealtimeStatusChip` | Live / Reconnecting / Updating | ✅ |
| TV | `_ConnectionBanner` | Connected / reconnecting / polling | ⚠️ Errors hidden |
| Admin | REST only | N/A | N/A |

**Recommendation:** Standardize customer copy to: **Live** · **Reconnecting…** · **Updating…** — remove “backup refresh” / “every few seconds” phrasing.

---

## Responsive audit summary

| App | Breakpoints tested (design intent) | Known issues |
|-----|-----------------------------------|--------------|
| Customer | 375–430px mobile-first `max-w-lg` | `maximumScale: 1`; sticky CTA safe-area; long waiting scroll |
| Staff | 390 / 768 / 1024 | Today dense on phone; wide console good |
| Owner | 1024+ tablet rail | Mobile hides Staff/Settings; dashboard scroll-heavy |
| Admin | 1280+ rail | Mobile bottom nav truncates 7 destinations |
| TV | 1920×1080 landscape | Strong; empty state contrast on dark |
| Marketing | 900px split | Hero works; no mobile nav |

---

## Loading / empty / error state coverage

| App | Loading | Empty | Error | Offline |
|-----|---------|-------|-------|---------|
| Customer | ✅ Generic skeleton | ✅ Premium empty | ✅ Premium error + retry | ✅ Banner + `/offline` |
| Staff | ✅ PageLoading | ✅ Staff empty states | ⚠️ Often shown as offline | ✅ StaffOfflineState |
| Owner | ✅ Skeletons | ✅ Mostly good | ✅ PageError | ⚠️ Cached hint only |
| TV | ✅ | ⚠️ Light empty on dark | ❌ Hidden | ⚠️ Banner only |
| Admin | ✅ | ✅ AdminEmptyHint | ✅ PageError | N/A |
| Marketing | N/A | N/A | N/A | N/A |

**Gap pattern:** Empty states often say “No data” equivalents instead of **what happened → what it means → what to do**.

---

## Admin persona differentiation

| Dimension | Owner app | Admin panel | Target |
|-----------|-----------|-------------|--------|
| Visual density | Medium | Should be higher | Admin more information-dense ✅ partial |
| Color persona | Premium executive | Dark rail + indigo | Distinct ✅ partial |
| Primary tasks | Business performance | System / tenants / users | Different ✅ |
| Command palette | None | None | **Missing — recommend Cmd+K** |
| Mobile UX | Drawer overflow | Bottom nav truncates | **Both need work** |

---

## Marketing accuracy vs product

| Claim | Accurate? |
|-------|-----------|
| QR join, no app download | ✅ Customer portal PWA |
| Live queue board / TV | ✅ TV display |
| Staff console | ✅ Staff app |
| Owner dashboard / analytics | ✅ Business app (reports tabs overstated) |
| WhatsApp / SMS notifications | ✅ Backend exists; production creds environment-dependent |
| Dine-in / takeaway / drive-in | ✅ Phase 2F complete |
| SSO (Enterprise tier) | ❌ Not implemented |
| Push notifications (customer) | ⚠️ Preference collected; no browser push flow |
| Offline staff app | ⚠️ Partial cache; overstated in FAQ |
| Pricing $49 / $149 | ⚠️ Marketing only — no billing integration |

---

## Security / production check (UX-adjacent)

| Check | Status |
|-------|--------|
| Demo passwords in docs only (env var) | ✅ `SEED_DEMO_PASSWORD` |
| Customer-visible API internals | ❌ branch-mode-page |
| Owner-visible API internals | ❌ staff_screen empty state |
| Staff login diagnostics | ⚠️ Exposes `apiBaseUrl` |
| CORS / JWT / Redis | Out of UX scope — verify in deployment checklist |

---

## Playwright E2E — current state

**No Playwright configuration exists** in the monorepo.

Required minimum tests (Phase 2G):

| Test | Flow |
|------|------|
| T1 | Customer opens QR landing |
| T2 | Customer joins Dine-in |
| T3 | Customer reaches tracking |
| T4 | Customer joins Takeaway |
| T5 | Customer joins Drive-in |
| T6 | Returning customer continues tracking |
| T7 | Queue closed state |
| T8 | Completed → feedback |

**Recommended location:** `apps/customer-portal/e2e/` with `playwright.config.ts`, using Bella Vista seed queue IDs from `docs/demo/bella-vista-manifest.json`.

---

## Demo environment — current state

| Asset | Exists? |
|-------|---------|
| Bella Vista seed | ✅ `backend/prisma/seed-restaurant-demo.ts` |
| Manifest | ✅ `docs/demo/bella-vista-manifest.json` |
| Demo guide | ✅ `docs/DEMO_RESTAURANT.md` (partial — pre–2F, dine-in focused) |
| Phase 2F E2E script | ✅ `docs/PHASE_2F_SERVICE_MODE_E2E.md` |
| Full ecosystem runbook | ❌ `docs/DEMO_RUNBOOK.md` not yet created |

---

## Recommended implementation order

### Wave 1 — Demo blockers (1–2 days)
*Unblocks client presentation without architectural changes.*

1. Remove customer API language (`branch-mode-page.tsx`)
2. Mode-aware join summary + live queue status
3. Fix completed page (fetch data before session clear; mode copy)
4. Isolate demo content to demo-only paths (`restaurant-content.ts`)
5. Staff Today: demote analytics, elevate Call Next + “Up next” identity
6. Staff: fix error vs offline conflation
7. Marketing: wire CTAs or mark “Coming soon”; remove SSO claim
8. TV: surface `lastError` + last-updated indicator

### Wave 2 — Owner & admin polish (1–2 days)
9. Owner dashboard: remove Simulator/Console from primary quick actions; gate developer tools
10. Owner: plain-language service performance; fix staff screen stub copy
11. Owner: fix QR Download + branchId display
12. Admin: mobile nav “More” overflow or restructure bottom bar
13. Admin: search on type (debounced)
14. Reports: real period tabs or single period until API exists

### Wave 3 — E2E & demo infrastructure (1–2 days)
15. Create `docs/DEMO_RUNBOOK.md` (full ecosystem script)
16. Add Playwright to customer-portal (8 minimum tests)
17. Run full test matrix; classify failures

### Wave 4 — Polish & consistency (ongoing)
18. Extend `service-mode-config` to ended/completed/feedback/welcome
19. Customer: venue-first branding; reduce “token” jargon
20. `ProductIdentity` rollout to TV, admin, marketing
21. Admin command palette (Cmd+K)
22. TV theme preset picker in settings
23. Responsive safe-area + accessibility (`maximumScale`)
24. Consolidate legacy customer components

---

## Files affected (master list)

### Customer Portal (22 files)
`branch-mode-page.tsx`, `queue-summary.tsx`, `live-queue-status.tsx`, `queue-join-experience.tsx`, `visit-completed.tsx`, `completed/[entryId]/page.tsx`, `restaurant-info-panel.tsx`, `need-help.tsx`, `notification-status.tsx`, `welcome-overlay.tsx`, `waiting-experience.tsx`, `while-you-wait.tsx`, `queue-ended.tsx`, `feedback-experience.tsx`, `restaurant-landing.tsx`, `layout.tsx`, `service-mode-config.ts`, `restaurant-content.ts`, `smart-wait-message.tsx`, `table-ready-experience.tsx`, `queue-timeline.tsx`, `token-display.tsx`

### Staff App (8 files)
`today_screen.dart`, `call_next_sheet.dart`, `notifications_screen.dart`, `customers_screen.dart`, `staff_empty_states.dart`, `login_screen.dart`, `staff_shell.dart`, `staff_queue_entry_card.dart`

### Business Owner App (10 files)
`dashboard_screen.dart`, `owner_quick_actions.dart`, `app_shell.dart`, `reports_screen.dart`, `staff_screen.dart`, `service_performance_panel.dart`, `qr_center_screen.dart`, `executive_dashboard_header.dart`, `queues_screen.dart`, `queue_console_screen.dart`

### TV Display (3 files)
`display_screen.dart`, `setup_screens.dart`, `display_board_provider.dart`

### Admin Panel (5 files)
`admin_shell.dart`, `admin_widgets.dart`, `app.dart`, `dashboard_screen.dart`, `tenants_screen.dart` / `users_screen.dart`

### Marketing (1 file)
`landing_page.dart`

### Design system (3 files)
`product_identities.dart`, `app_badge.dart`, `empty_state_view.dart`

### New files (Phase 2G)
`docs/DEMO_RUNBOOK.md`, `apps/customer-portal/playwright.config.ts`, `apps/customer-portal/e2e/*.spec.ts`

---

## Success criterion (Phase 2G exit)

> Can we open QueueFlow in front of a restaurant client and demonstrate the entire **customer → staff → owner → TV → admin** ecosystem without encountering confusing UX, broken states, fake data, or unexplained behavior?

| Gate | Current |
|------|---------|
| Customer journey end-to-end | ⚠️ Works with Bella Vista; copy gaps on completed/ended |
| Staff receptionist flow | ⚠️ Works; Today still analytics-heavy |
| Owner executive story | ⚠️ Works; developer tools leak |
| TV public readability | ✅ Good; error visibility gap |
| Admin platform control | ⚠️ Good on desktop; mobile nav gap |
| Marketing as front door | ❌ CTAs dead |
| Documented demo runbook | ⚠️ Partial |
| Playwright E2E | ❌ Not started |
| No customer-visible dev language | ❌ |

**Target score after Wave 1–3: 8.5 / 10**

---

## Next step

Per Phase 2G execution rule: **implement Wave 1 only** after this audit is reviewed — highest-value fixes, smallest safe diffs, no Queue Engine changes, no fake APIs.
