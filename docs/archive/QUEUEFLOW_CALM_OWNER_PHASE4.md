# QueueFlow — Calm Premium Owner UX (Phase 4)

**Status:** Complete  
**App:** `apps/business_app` (Business Owner)  
**Rule:** Frontend only — no API, auth, realtime, or queue engine changes.

---

## 1. Goal

Unify the remaining Business Owner operational surfaces under the Calm Premium design system so the full owner experience feels like one product: calm, obvious, and fast during rush hour.

**North star test:** *Can a stressed receptionist understand what to do within 2 seconds?*

---

## 2. Screens redesigned

| Screen | Route | Priority | Status |
|--------|-------|----------|--------|
| Queue Console | `/queues/:id/console` | P0 | ✅ Calm vertical workspace |
| Queue Detail | `/queues/:id` | P0 | ✅ Operational summary + bridge to console |
| Customers | `/customers` | P1 | ✅ Search-first hospitality lookup |
| Customer Detail | `/customers/:id` | P1 | ✅ Calm profile + visit history |
| Alerts | `/notifications` | P1 | ✅ Action-oriented sections |
| Settings | `/settings` | P2 | ✅ Grouped restaurant settings |
| Queue Settings | `/queues/:id/settings` | P2 | ✅ Calm form styling |

**Not in scope (Phase 4):** Admin panel, TV display, auth screens, demo simulator internals.

---

## 3. Visual system

Uses existing Calm tokens from `packages/theme`:

| Token | Value | Use |
|-------|-------|-----|
| Warm Ivory | `#FAF8F5` | Screen backgrounds |
| Calm Violet | `#8B7CF8` | Primary actions, brand |
| Lilac / Peach | theme tokens | Cards, highlights |
| Warm Gray | theme tokens | Secondary text |
| Charcoal | theme tokens | Primary text |

Color communicates meaning only:

- **Violet** — primary actions
- **Green** — complete / healthy
- **Amber** — attention
- **Red** — critical (used sparingly)

---

## 4. New shared components

All live under `apps/business_app/lib/shared/widgets/calm/`:

| Component | Purpose |
|-----------|---------|
| `CalmQueueEntryCard` | WHO / WHAT / HOW LONG / STATUS / actions |
| `CalmCustomerCard` | Customer lookup result |
| `CalmAlertCard` | Action-oriented alert with severity |
| `CalmSettingsSection` | Grouped settings with section label |
| `CalmSettingsTile` | Single settings row |
| `CalmSearchField` | Large hospitality search input |
| `CalmEmptyState` | Reassuring empty states |
| `CalmPrimaryButton` | Full-width violet/success/danger CTA |
| `CalmStatusBadge` | Human-readable entry status |
| `CalmEntryHelpers` | Service-mode-aware titles and wait labels |

**Reused from Phase 3:** `CalmCard`, `CalmSectionLabel`, `CalmLiveIndicator`.

---

## 5. Queue Console architecture

**Before:** Horizontal kanban (Waiting → Preparing → Now Serving → …) with `MetricCard`, `AppCard`, technical density.

**After:** Calm vertical operational workspace:

```
Header: Queue name · ● Live
Stats:  N waiting · ~X min average wait
Sections:
  NOW SERVING      (CALLED entries, with Complete / Recall / Hold / Skip)
  ON HOLD          (HOLDING entries, Resume / Skip)
  NEXT UP          (first WAITING entry, highlighted)
  WAITING          (remaining WAITING, compact)
  COMPLETED        (last 5 today, compact)
Sticky footer:
  [ Call next ]     primary
  [ Add customer ]  secondary (walk-in dialog)
```

**Preserved:**

- All queue ops APIs (`callNext`, `holdEntry`, `resumeHeld`, `skipEntry`, `recallEntry`, `completeEntry`, `walkIn`, `transferEntry`)
- `queueConsoleRealtimeBindingProvider` — Socket.IO + 10s polling fallback
- `queueSnapshotProvider` — `getQueueSnapshot(queueId)`

**Removed from UI:** UUIDs, raw API status strings, kanban columns that implied a developer workflow.

---

## 6. Queue Detail architecture

Bridge screen between queue list and console:

- Live snapshot metrics (waiting count, average wait)
- Service mode label (Dine-in / Takeaway / Drive-in)
- Quick actions: **Manage queue** → console, **Customer QR** → QR Center
- Queue status controls (Open / Pause / Resume / Close) — business logic unchanged
- Sticky **Open queue console** CTA

Uses same realtime binding as console for live counts.

---

## 7. Customers architecture

**Primary action:** Search.

- Large `CalmSearchField`: "Search name, phone or token"
- Single-result `CalmCustomerCard` with visit count
- Customer detail: avatar, phone, recent queue visits with calm status badges
- Friendly errors — no technical exceptions shown

**APIs:** `lookupCustomer`, `getCustomer`, `getCustomerHistory`

**Not added:** CRM filters, scoring, segmentation, fabricated analytics.

---

## 8. Alerts architecture

Renamed in navigation to **Alerts** (route unchanged: `/notifications`).

Organized by action, not inbox volume:

| Section | Content |
|---------|---------|
| Needs attention | Pending / undelivered notifications |
| Customer issues | Failed, no-show, issue types |
| Completed | Delivered / completed notifications |

Each card answers: *What happened? Why does it matter? What can I do?*

**API:** `getNotifications(page)` — paginated, existing notifier preserved.

**Limitation:** Backend notification types are generic (`type`, `status`, `message`). Human-readable titles are derived client-side from type strings; rich operational alerts (e.g. "Sarah has been waiting 32 minutes") require backend alert rules in a future phase.

---

## 9. Settings architecture

Grouped for non-technical restaurant owners:

| Group | Items |
|-------|-------|
| **Restaurant** | Details, Branches, Service modes |
| **Team** | Staff, Invitations (coming soon) |
| **Customer experience** | Notifications, Queue settings |
| **Account** | Profile, Security, Subscription (coming soon) |
| **Advanced** | Developer tools (bottom sheet), Dark mode |

Developer tools (Demo simulator, Table floor) are hidden behind **Advanced → Developer tools** — not in primary navigation or drawer.

---

## 10. Service mode terminology

Aligned with `service_mode_helpers.dart`:

| Mode | Units | Card title | Subtitle |
|------|-------|------------|----------|
| DINE_IN | parties | Customer name | Party of N |
| TAKEAWAY | orders | Name or Order #code | Order #code |
| DRIVE_IN | cars | Vehicle / name | Phone or token |

Complete button: **Mark collected** (takeaway) vs **Complete** (dine-in / drive-in).

---

## 11. Navigation (unchanged contracts)

**Primary bottom nav:** Home · Queues · QR · Staff · Reports  
**More drawer:** Branches · Customers · Alerts · Settings  
**Developer tools:** Settings → Advanced → Developer tools only

---

## 12. Realtime behavior

Unchanged architecture:

- `RealtimeClient` + Socket.IO subscriptions
- `bindRealtimeRefresh` with 10s polling fallback
- `CalmLiveIndicator`: **Live** / **Updating…**

Shown subtly in queue detail and console app bars — never dominates the screen.

---

## 13. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| Phone | Single column; primary nav + More drawer for secondary |
| Tablet | Dashboard two-column (Phase 3); operational screens use full width with calm density |
| Desktop | Wider content areas; queue console sections stack vertically (not stretched kanban) |

---

## 14. Legacy cleanup

**Removed (unused):**

- `executive_dashboard_header.dart`
- `live_queue_activity_panel.dart`

**Still legacy but out of Phase 4 scope:**

- `demo_simulator_screen.dart`, `table_floor_screen.dart` — developer tools only
- Auth screens (`login_screen.dart`) — still use `AppCard`
- `branches_screen.dart` — partial calm styling from Phase 3

---

## 15. Data sources (no fabrication)

| Screen | API |
|--------|-----|
| Queue Console / Detail | `getQueueSnapshot` |
| Queue list | `getQueues` |
| Customers | `lookupCustomer`, `getCustomer`, `getCustomerHistory` |
| Alerts | `getNotifications` |
| Settings profile | `getBusiness` |
| Dashboard (Phase 3) | `getQueues`, `getDailySummary` |

Empty states shown when data is unavailable — no invented metrics.

---

## 16. Files changed (Phase 4)

### New

- `lib/shared/widgets/calm/calm_customer_card.dart`
- `lib/shared/widgets/calm/calm_alert_card.dart`
- `lib/shared/widgets/calm/calm_settings_section.dart`
- `lib/shared/widgets/calm/calm_entry_helpers.dart`
- `lib/shared/widgets/calm/calm_status_badge.dart`
- `lib/shared/widgets/calm/calm_primary_button.dart`
- `lib/shared/widgets/calm/calm_search_field.dart`
- `lib/shared/widgets/calm/calm_empty_state.dart`
- `lib/shared/widgets/calm/calm_queue_entry_card.dart`

### Redesigned

- `lib/features/queue_console/presentation/queue_console_screen.dart`
- `lib/features/queues/presentation/queues_screen.dart` (QueueDetailScreen, QueueSettingsScreen)
- `lib/features/customers/presentation/customers_screen.dart`
- `lib/features/notifications/presentation/notifications_screen.dart`
- `lib/features/settings/presentation/settings_screen.dart`

### Removed

- `lib/features/dashboard/presentation/widgets/executive_dashboard_header.dart`
- `lib/features/dashboard/presentation/widgets/live_queue_activity_panel.dart`

---

## 17. Verification

| Check | Result |
|-------|--------|
| `flutter analyze` | ✅ No errors (pre-existing warnings only) |
| `flutter test` | ✅ 7/8 pass — known `StatCard golden` google_fonts failure |
| `flutter build web` | ✅ Success |

---

## 18. Remaining backend limitations

1. **Alerts** — notification payload lacks structured operational context (wait time, queue name, customer name). Client derives human titles from `type` string.
2. **Customers** — no "recent customers" list API; search-only flow.
3. **Customer history** — no service mode on history entries; status badges use dine-in labels.
4. **Queue entry metadata** — no vehicle/plate fields in owner app model; drive-in cards use name/phone/token only.
5. **Settings** — invitations, security, subscription, branding are placeholders.
6. **Reports** — daily summary only (documented in Phase 3).

---

## 19. Remaining UX issues

1. Auth/login screens still use legacy `AppCard` styling.
2. Branches detail/edit forms partially legacy.
3. Demo simulator and table floor remain developer-oriented (intentionally in Advanced).
4. No dedicated "recent customers" section without backend support.
5. Queue console lacks inline "Currently called" separate from "Now serving" when backend uses single CALLED status.

---

## 20. Recommended next phase

**Phase 5 — Admin + TV + Auth polish**

1. Calm redesign of login / forgot-password flows
2. Branches CRUD calm forms
3. TV display calm pass-through (read-only, large type)
4. Admin panel operational calm (if in scope)
5. Backend: structured alert payloads for operational "needs attention" items
6. Backend: recent customers endpoint for hospitality lookup

---

## 21. Owner walkthrough checklist

| Step | Pass criteria |
|------|---------------|
| Login | Friendly errors only |
| Home | Waiting now, avg wait, needs attention — calm |
| Queues | Service mode labels, tap to detail |
| Queue Detail | Obvious "Open queue console" |
| Console | Call next obvious; sections readable |
| Customers | Search is primary action |
| Alerts | Grouped, not inbox overload |
| QR Center | Calm (Phase 3) |
| Staff | Calm (Phase 3) |
| Reports | Honest empty/limit states |
| Branches | Functional |
| Settings | Grouped, developer tools hidden |

**Calm UX standard achieved when:** *"I know what is happening. I know what I need to do. Everything is under control."*
