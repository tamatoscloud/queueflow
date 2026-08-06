# Phase 2G Wave 2 — Owner + Admin + Reporting + Accessibility

Implementation date: 2026-08-03  
Scope: Business Owner App, Super Admin App, reports honesty, accessibility

Prior work: [PHASE_2G_WAVE1_IMPLEMENTATION.md](./PHASE_2G_WAVE1_IMPLEMENTATION.md)

---

## 1. Owner UX changes

### Dashboard hierarchy (`dashboard_screen.dart`, `executive_dashboard_header.dart`)
- Removed **Simulator** and **Queue Console** from primary dashboard surface
- Executive header leads with **waiting now**, **avg wait today**, **served**, **no-shows**
- Removed decorative fake **peak hours** chart (no hourly API exists)
- Insights use only real data: live waiting, daily summary, queue count
- **Live queue activity** and **service performance** remain primary operational sections
- Owner **shortcuts** grid: QR Center, Reports, Staff, Queues (all real routes)
- Queue list navigates to **Queues** management (not staff console)

### Developer tools demotion (`app_shell.dart`, `settings_screen.dart`)
- Mobile drawer: **More** navigation first; developer tools at bottom, muted
- Developer tools moved to **Settings → Developer tools**: Demo Simulator, Table Floor

### Service performance (`service_performance_panel.dart`)
- Uses `GET /restaurant/analytics` (`getModeAnalytics`) — real `byMode` data
- Combines with live queue waiting counts per mode
- Owner-friendly copy: "42 served · 7 orders · ~12 min average wait"
- Empty state: "Not enough data yet"

### Quick actions (`owner_quick_actions.dart`)
- FAB unchanged: Add queue, Add branch, Invite staff, QR Center, View reports

### QR Center (`qr_center_screen.dart`, `service_mode_helpers.dart`)
- Posters use **SCAN TO JOIN** with mode-specific sublines (Dine-in / Takeaway / Drive-in)
- Removed raw `branchId` from preview subtitle
- Removed misleading **Download** button (was copying URL); kept Copy, Share, Print

### Reports (`reports_screen.dart`, `report_model.dart`)
- Fixed `DailySummaryModel.fromJson` to parse nested API `totals` / `waitTime`
- Removed fake Weekly/Monthly tabs (same API was used for all three)
- Single **Today's summary** view with joined, served, still waiting, avg wait, no-shows
- Premium empty state when no activity
- Honest note that weekly/monthly reports are not available yet

---

## 2. Admin UX changes

### Navigation (`admin_shell.dart`)
- Mobile bottom nav: **Overview · Businesses · Alerts · Support · More**
- **More** opens drawer with all 12 destinations
- Fixed selection highlight for overflow routes (no longer clamps to Subscriptions)
- Desktop rail: all 12 destinations; labels updated (Overview, Businesses, Alerts)

### Dashboard (`dashboard_screen.dart`)
- Renamed to **Platform overview**
- **Attention needed** card when failed notifications > 0 → links to Alerts
- Removed misleading **Activity Overview** chart (was re-visualizing KPI snapshot)
- Compact platform health summary + link to Health screen
- Quick links: Businesses, Support, Analytics, Feature flags
- Revenue MRR shown only with honest billing-pending note

### Health (`health_screen.dart`)
- Friendly status per service: **Healthy / Degraded / Needs attention**
- Expansion tiles reveal technical details on demand

### Command palette (`admin_command_palette.dart`)
- **Ctrl/Cmd+K** and search icon in top bar
- Navigation-only search across all 12 destinations (no fake global search backend)

### Feature flags (`feature_flags_screen.dart`)
- Clarified per-business overrides are **API-managed**; no fake tenant toggles

---

## 3. Reports changes

| Before | After |
|--------|-------|
| Daily/Weekly/Monthly tabs (same data) | Single today view |
| Peak hour metric (always 0) | Removed |
| Flat JSON parsing (zeros) | Nested `totals` / `waitTime` parsing |
| Empty grid with zeros | Empty state when no activity |

---

## 4. Accessibility changes

### Customer portal (`apps/customer-portal/src/app/layout.tsx`)
- Removed `maximumScale: 1` from viewport — users can zoom again

---

## 5. Responsive changes

- Owner dashboard grid uses `Breakpoints.isTablet` for shortcut columns
- Admin mobile nav pattern prevents hiding 7 of 12 destinations
- Reports grid adapts 2/3 columns by breakpoint

---

## 6. Real-data verification

| Surface | Source | Notes |
|---------|--------|-------|
| Owner waiting now | `getQueues` fold | Live |
| Owner served / no-shows / avg wait | `GET /reports/daily-summary` | Fixed parser |
| Service performance | `GET /restaurant/analytics` + live queues | No fabricated trends |
| Owner insights | Derived from above only | No % trends |
| Admin KPIs | `GET /platform/dashboard` | Live Prisma counts |
| Admin health | `GET /platform/health` | Redis probed; API/socket static `up` |
| Admin revenue MRR | Dashboard API | Always null with note |
| Reports peak hour | — | Removed (not in API) |
| Activity chart (admin) | — | Removed (not time-series) |

---

## 7. Tests

| Target | Result |
|--------|--------|
| Backend | **76/76** pass |
| Customer | **27/27** pass |
| Business | **7/8** pass (pre-existing StatCard golden/font) · web build OK |
| Admin | **6/10** pass (pre-existing golden + login copy) · web build OK |
| Staff / TV / Marketing | Unchanged from Wave 1 |

---

## 8. Existing known failures (pre-existing)

- `business_app/test/widget_test.dart` — StatCard golden + google_fonts network
- `admin_panel` golden login screen + tests expecting "QueueFlow Super Admin" copy

---

## 9. Backend limitations

| Limitation | Impact |
|------------|--------|
| No weekly/monthly report APIs | Single daily view only |
| No hourly/peak breakdown | Peak chart removed |
| `CreateQueueDto` lacks `serviceMode` | Queue creation UI cannot set mode (unchanged) |
| Per-tenant feature flags API-only | No in-app tenant override toggles |
| Dashboard `systemHealth` partial static | API/socket always `up`; Redis live |
| `revenueMrr` null | Shown as unavailable |

No Queue Engine or schema changes were made.

---

## 10. Remaining Wave 3 items

- Playwright E2E suite
- `DEMO_RUNBOOK.md`
- Owner mobile nav: expose all 9 destinations without drawer-only overflow
- Admin login test copy alignment
- Hourly analytics API (if peak visualization desired)
- Weekly/monthly report APIs
- Per-tenant feature flag UI on business detail screen
