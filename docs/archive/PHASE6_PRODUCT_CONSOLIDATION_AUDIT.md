# Phase 6 — Product Consolidation Audit

**Date:** August 2026  
**Scope:** Full monorepo UX hardening and demo readiness  
**Rule:** Audit-first — implementation limited to P0 fixes only

---

## Executive summary

QueueFlow has completed Calm Premium redesigns across Customer (Phase 2), Staff (1/1B), Owner (3/4), and Admin (5). The ecosystem **feels like one product on primary paths** but has **consolidation debt** in secondary screens, cross-app terminology drift, error handling gaps, and demo-safety leaks.

**P0 count:** 9 issues blocking safe restaurant operation or client demo  
**P1 count:** 24 issues creating significant friction  
**P2 count:** 31 polish/consistency items  
**P3 count:** 12 optional enhancements

---

## 1. Legacy UI still visible

| App | Active legacy | Calm migrated | Dead code |
|-----|---------------|---------------|-----------|
| **customer-portal** | `page.tsx`, `success-content.tsx` | Active routes use calm/light | ~60 files in `waiting/`, `queue/`, legacy join |
| **staff_app** | Auth, customers, notifications, profile, settings | Today, Queue Console | `staff_queue_entry_card.dart` (unused) |
| **business_app** | Auth, branches, staff_home, restaurant_demo/* | Dashboard, queues, console, customers, alerts, settings | `executive_dashboard_header` (removed Phase 4) |
| **admin_panel** | Branches, users, subscriptions, audit | Overview, businesses, alerts, health, etc. | — |
| **tv_display** | Entire app — dark gradient, AppCard | None | — |
| **marketing** | Entire landing — gradient SaaS | None | — |

---

## 2. Duplicate components

| Duplicate | Locations | Recommendation |
|-----------|-----------|----------------|
| `ServiceModeInfo` | staff `service_mode_helpers.dart`, owner `restaurant_demo/service_mode_helpers.dart`, web `service-mode-config.ts` | Extract shared contract doc; move owner helpers out of demo path |
| `CalmCard` / calm primitives | staff_app, business_app, admin_panel (3 copies) | Acceptable for now; consolidate to `packages/ui` in P2 |
| `RealtimeStatusChip` vs `CalmLiveIndicator` | staff/owner shells vs calm screens | Standardize on CalmLiveIndicator in operational surfaces |
| `StaffHomeScreen` vs `staff_app` Today | business_app `staff_home_screen.dart` vs staff_app | Retire business_app staff route (P0) |
| Activity vs Audit (admin) | Same audit API, two screens | Keep Activity as calm face; audit in More for power users |

---

## 3. Conflicting colors/tokens

| Issue | Where | Priority |
|-------|-------|----------|
| Dark nav removed from admin but TV still dark gradient | tv_display | P1 |
| Owner `OwnerQuickActionsFab` uses `product.accent` not calm violet | business_app | P2 |
| Staff shell gradient icon vs calm ivory | staff_app shell | P2 |
| Marketing mesh gradient vs calm ivory system | marketing_website | P1 |
| Hardcoded `#8b7cf8` in customer calm components | customer-portal calm/* | P2 (matches token but not CSS var) |

---

## 4. Typography inconsistencies

| Issue | Priority |
|-------|----------|
| TV uses legacy Inter scale; calm system uses display/body hierarchy | P1 |
| Admin secondary screens use default Material title sizes | P2 |
| Customer track uses Light experience; landing uses Calm | P1 |

---

## 5. Different button behavior

| Issue | Priority |
|-------|----------|
| Staff Call Next opens sheet; Owner Call Next is direct API call | P1 |
| Staff skip = "No show"; Owner skip = "Skip" | P1 |
| Join: two-step Continue → Join vs E2E expects one-click mode CTA | P0 |

---

## 6. Different loading states

| Screen | Pattern | Expected |
|--------|---------|----------|
| Staff Today | PageLoading spinner | CalmQueueSkeleton (P1) |
| Owner Queue Console | CircularProgressIndicator | Skeleton (P1) |
| Owner Dashboard | DashboardSkeleton | ✅ |
| Admin secondary | PageLoading | CalmPageScaffold skeleton (P2) |

---

## 7. Different error language

| Path | Issue | Priority |
|------|-------|----------|
| `branches_screen.dart` | Raw `$e` | **P0** |
| `staff_home_screen.dart` | Raw `$e` | **P0** |
| Demo screens (simulator, table floor) | Raw `$e` | P2 (demo only) |
| Owner dashboard/console | Generic only — misses mapped auth/network | P1 |
| TV display board | `e.toString()` in state | P2 |

---

## 8. Different terminology

| Term | Staff | Owner | Customer web |
|------|-------|-------|--------------|
| Dine-in waiting unit | people | parties | parties |
| Skip action | No show | Skip | — |
| Call next | Mode-specific | Generic "Call next" | — |

**Priority:** P1 — align per UX Contract

---

## 9. Service-mode label issues

| Issue | File | Priority |
|-------|------|----------|
| Owner helpers in `restaurant_demo/` imported by production | multiple business_app files | **P0** |
| `waiting-experience.tsx` (legacy) uses "party" without mode check | customer-portal legacy | P2 (dead route) |
| Active calm/light paths use `service-mode-config.ts` correctly | — | ✅ |

---

## 10. Broken/misleading empty states

| Screen | Issue | Priority |
|--------|-------|----------|
| Owner customer history | Uses dine-in status labels for all modes | P2 |
| Admin business list | No "needs attention" filter (API limited) | P2 |
| Analytics peak hours | Shows "—" with note — honest ✅ | — |

---

## 11. Dead navigation

| Route | Issue | Priority |
|-------|-------|----------|
| `AppRoutes.staffToday` in business_app | Legacy StaffHomeScreen | **P0** |
| Customer `/q/[id]/success` | Redirect shim with legacy PageShell | P1 |
| Customer root `/` | Legacy marketing-style page | P1 |

---

## 12. Placeholder screens

| Screen | Status |
|--------|--------|
| Owner Settings → Invitations | "Coming soon" — honest ✅ |
| Owner Settings → Security/Subscription | Placeholder — honest ✅ |
| Admin business detail | No per-day metrics — honest empty ✅ |

---

## 13. Demo content accidentally exposed

| Issue | File | Priority |
|-------|------|----------|
| "Browse menu after joining" for ALL restaurants | `calm-landing.tsx` | **P0** |
| Marketing Bella Vista testimonial | `landing_page.dart` | P2 |
| Demo menu tips correctly gated | `light-waiting-experience.tsx` | ✅ |

---

## 14. Technical language exposed

| Location | Priority |
|----------|----------|
| branches_screen `$e` | **P0** |
| staff_home_screen `$e` | **P0** |
| TV "Connection lost · Queue information may be outdated" | P1 (acceptable but could be calmer) |

---

## 15. Inconsistent realtime indicators

| Issue | Priority |
|-------|----------|
| Shell `RealtimeStatusChip` "Offline" vs calm "Updating…" | P1 |
| `CalmLiveIndicator` used for queue Open/Paused on owner dashboard | **P0** |
| Customer BookingShell static green "Live" pill | P2 |
| Owner collapses Reconnecting → Updating | P1 |

---

## 16. Accessibility problems

| Issue | Priority |
|-------|----------|
| Notifications AppButton sm < 48px (staff) | P2 |
| Queue status chips may be < 48px (owner) | P2 |
| TV readable at distance — OK with fontScale | ✅ |
| Command palette keyboard nav (admin) | ✅ |

---

## 17. Mobile usability problems

| Issue | Priority |
|-------|----------|
| Admin 12 destinations — mobile uses More drawer ✅ | — |
| Owner queue console sticky Call Next ✅ | — |
| Staff Today full-screen spinner on slow network | P1 |

---

## 18. Too many primary actions

| Screen | Issue | Priority |
|--------|-------|----------|
| Owner Dashboard | FAB + CalmQuickActions grid overlap | P1 |
| Staff Today | Call Next dominant ✅ but legacy secondary AppButtons | P2 |

---

## 19. Unclear next action

| Screen | Issue | Priority |
|--------|-------|----------|
| Customer join | Generic "Join the queue" for takeaway/drive-in | P1 |
| Owner queue detail | Must tap through to console for Call Next | P2 (by design) |

---

## 20. Unnecessary navigation

| Issue | Priority |
|-------|----------|
| business_app staff route duplicates staff_app | **P0** |
| Customer success route extra hop | P1 |

---

## Rush-hour scenario findings

| Scenario | Key finding | Priority |
|----------|-------------|----------|
| **A: 25 people waiting** | Staff/owner consoles handle vertical sections; Today spinner delays orientation | P1 |
| **B: 12 takeaway orders** | Terminology mostly correct; owner "Call next" not mode-specific | P1 |
| **C: 8 cars waiting** | Drive-in cards lack plate metadata in owner model | P2 |
| **D: CALLED, staff busy** | Customer ready state works; staff sees serving section | ✅ |
| **E: Realtime disconnect** | Polling fallback works; labels inconsistent | P1 |
| **F: Accidental Call Next** | No undo; sheet on staff provides preview | P2 |
| **G: Empty queue** | Empty states reassuring on owner console | ✅ |
| **H: Queue paused** | Pause confirmed on owner; staff shows paused state | ✅ |
| **I: Close while waiting** | Close NOT confirmed — risky | P1 |
| **J: Multiple staff** | Last-write-wins via API; no conflict UI | P2 (backend) |

---

## P0 implementation backlog (fix now)

| # | Issue | App | File(s) | Status |
|---|-------|-----|---------|--------|
| 1 | Demo menu promise on all restaurant landings | customer-portal | `calm-landing.tsx` | ✅ Fixed |
| 2 | Raw `$e` on branches screen | business_app | `branches_screen.dart` | ✅ Fixed |
| 3 | Raw `$e` on staff home (routed legacy path) | business_app | `staff_home_screen.dart` | ✅ Fixed |
| 4 | CalmLiveIndicator misused for queue Open/Paused | business_app | `calm_service_mode_overview.dart` | ✅ Fixed |
| 5 | Skip/no-show without confirmation | staff_app + business_app | queue console entry actions | ✅ Fixed |
| 6 | Production imports from `restaurant_demo/service_mode_helpers` | business_app | Move helpers to shared path | ✅ Fixed |
| 7 | Legacy StaffHomeScreen routed at `staffToday` | business_app | `app_router.dart` — redirect or remove | ✅ Fixed |
| 8 | E2E join flow out of sync with UI | customer-portal | `e2e/customer-journey.spec.ts` | ✅ Fixed |
| 9 | Marketing pricing contradicts backend seed | marketing_website | `landing_page.dart` | ✅ Fixed |

---

## P1 backlog (do not implement in Phase 6 pass 1)

- Migrate admin secondary screens to calm
- TV calm redesign
- Consolidate realtime indicator components
- Owner/staff terminology alignment
- Close queue confirmation
- Customer join mode-specific CTAs
- Remove dead legacy component trees
- Wire admin top-bar health to live data
- Add Playwright to CI
- Customer track → unified calm experience

---

## P2 backlog

- Auth screens calm migration (all apps)
- packages/ui calm primitive extraction
- Touch target audit on chips
- Marketing editorial calm pass
- Delete dead staff_queue_entry_card, legacy customer components

---

## P3 backlog

- Shared Flutter service_mode package
- Voice announcements on TV
- Multi-staff conflict UI
- Business list enrichment from backend

---

## Legacy component cleanup candidates

| Component | Status | Action |
|-----------|--------|--------|
| `staff_queue_entry_card.dart` | Unused | Safe to delete (P2) |
| `customer-portal/components/queue/*` | Not routed | Delete after track migration (P1) |
| `customer-portal/components/customer/waiting/*` | Not routed | Delete after track migration (P1) |
| `executive_dashboard_header.dart` | Deleted Phase 4 | Done ✅ |
| `AdminDataCard` on admin secondary | Active | Migrate (P1) |

---

## Design token migration list

| Token | Hardcoded locations | Migrate when |
|-------|---------------------|--------------|
| `#8b7cf8` | customer-portal calm components | P2 — use CSS vars |
| `AppColors.primary` | legacy screens | As each screen migrates |
| `neutral900` nav | removed from admin | TV still uses dark — P1 |

---

## Demo content safety audit

| Content | Gated? | Action |
|---------|--------|--------|
| MENU_TIPS, POPULAR_DISHES | `isRestaurantDemo()` | ✅ |
| calm-landing menu card | `isRestaurantDemo()` | ✅ Fixed |
| restaurant-content.ts | Helper only | ✅ |
| Developer tools in owner shell | Settings → Advanced | ✅ |
| Demo simulator | Settings → Advanced | ✅ |
| Marketing testimonial "Bella Vista" | No | P2 |

---

## Recommended implementation order (post-audit)

1. ✅ Complete audit documentation (this file + UX Contract + runbook + E2E strategy + production readiness)
2. **P0 fixes** (9 items above)
3. Run all test suites
4. **Stop and report** — do not proceed to P1 without explicit approval
