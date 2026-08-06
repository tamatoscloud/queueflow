# Business Owner App UX Polish (Phase 2D)

## Persona

Restaurant owner / manager who needs an **executive view** of queue health, wait times, and business performance — not operational queue controls.

## Navigation

Shell destinations: Dashboard, Branches, Queues, Reports, QR Center, Staff, Customers, Alerts, Settings

Staff-role users are routed to `/today` via persona resolver (unchanged).

## Dashboard

Executive header (`ExecutiveDashboardHeader`):

- Health score ring
- Waiting now + average wait (animated counters)
- Served today, no-shows
- Peak hours visualization (from `DailySummaryModel.peakHour`)
- Actionable insight (derived from real waiting count + summary — no fake benchmarks)

**Quick Actions FAB** — floating button opens sheet:

- Add queue
- Add branch
- Invite staff
- QR Center
- View reports

## QR Center

Premium QR preview with:

- Restaurant / queue name
- Large scannable QR (`CustomerPortalUrl.joinUrl(queueId)`)
- Copy URL, share, print layout
- Service mode tabs (Dine-in / Takeaway / Drive-in) — **UI structure only**; separate backend endpoints not yet available (documented in-screen)

## Data sources (real APIs only)

| Metric | API |
|--------|-----|
| Waiting now | `GET /queues` → `waitingCount` sum |
| Avg wait, served, no-shows | `GET /reports/daily-summary` |
| Peak hour | `DailySummaryModel.peakHour` |
| Notifications | `GET /notifications` |

Insights are generated only from available fields. No invented “28% busier than usual” without historical API support.

## Testing

```bash
cd apps/business_app
flutter analyze
flutter test
flutter build web
```

Tests: `test/owner_ux_test.dart`
