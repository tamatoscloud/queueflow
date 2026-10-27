# QueueFlow — Calm Premium Super Admin UX (Phase 5)

**Status:** Complete  
**App:** `apps/admin_panel` (Super Admin / Platform Administration)  
**Rule:** Frontend only — no API, auth, queue engine, or database changes.

---

## 1. Architecture audit

### Before Phase 5

- Dark nav rail (`neutral900`) + enterprise dashboard aesthetic
- `MetricCard` KPI grids on overview and analytics
- `AppCard` / `GradientHeader` throughout
- 12 flat nav destinations with no hierarchy
- Technical status badges inline on dashboard
- Login: gradient mesh + split `AppCard` layout

### After Phase 5

- **Calm Control Center** — warm ivory surfaces, violet accents, readable hierarchy
- Platform questions answered in order: health → attention → businesses → support → activity
- Technical details collapsed behind expandable rows
- Primary nav: Overview, Businesses, Alerts, Support, Analytics, Health, Activity, Feature Flags, Settings
- Secondary (More): Branches, Users, Subscriptions, Audit log
- Mobile: Overview · Businesses · Alerts · More

### Entry points (unchanged)

- `lib/main_dev.dart`, `main_staging.dart`, `main_production.dart` → `bootstrap.dart`

---

## 2. Screens redesigned

| Screen | Route | Changes |
|--------|-------|---------|
| **Login** | `/login` | Calm ivory card, simple QueueFlow + Platform Administration |
| **Overview** | `/dashboard` | Greeting, health rows, needs attention, calm stat rows |
| **Businesses** | `/tenants` | Search, filter chips, calm business cards |
| **Business detail** | `/tenants/:id` | Platform admin hierarchy — status, branches, account |
| **Alerts** | `/notifications` | Critical / delivery summary / failed deliveries |
| **Support** | `/support` | Open / Waiting / Resolved sections, search |
| **Analytics** | `/analytics` | Real API metrics only, no decorative charts |
| **Health** | `/health` | Calm service rows with expandable technical details |
| **Activity** | `/activity` | Human-readable audit timeline (no `/platform/activity` API) |
| **Feature flags** | `/feature-flags` | Global toggles + honest business override message |
| **Settings** | `/settings` | Account / Platform / Advanced grouping |

**Shell:** Light calm nav rail, ivory background, polished command palette (Ctrl/Cmd+K).

**Not redesigned (secondary, still functional):** Branches, Users, Subscriptions, Audit — remain accessible via More.

---

## 3. Components created

`apps/admin_panel/lib/shared/widgets/calm/`:

| Component | Purpose |
|-----------|---------|
| `calm_card.dart` | Primary surface |
| `calm_section_label.dart` | Uppercase section headers |
| `calm_primary_button.dart` | Violet / outline / danger CTAs |
| `calm_empty_state.dart` | Reassuring empty states |
| `calm_search_field.dart` | Large search inputs |
| `calm_page_scaffold.dart` | Page wrapper, skeletons, errors |
| `calm_stat_row.dart` | Single metric (no MetricCard) |
| `calm_status_dot.dart` | Dot + human status label |
| `calm_health_row.dart` | Expandable service health |
| `calm_attention_card.dart` | What happened / why / action |
| `calm_business_card.dart` | Business list cards |
| `admin_calm_helpers.dart` | Status labels, greetings, health keys |

Settings sections defined in `settings_screen.dart` (`CalmSettingsSection`, `CalmSettingsTile`).

---

## 4. Components reused

- `packages/theme` — `AppColors.calmIvory`, `calmViolet`, `calmLilac`, etc.
- `queueflow_ui` — `AppTextField`, `AppButton` (dialogs only)
- `admin_widgets.dart` — `AdminPagination` (unchanged)
- `PlatformApiClient` — all existing endpoints

---

## 5. Navigation changes

### Desktop nav rail (primary)

Overview → Businesses → Alerts → Support → Analytics → Health → Activity → Feature Flags → Settings

### More section

Branches · Users · Subscriptions · Audit log

### Mobile bottom nav

Overview · Businesses · Alerts · More (drawer for all destinations)

### New route

`AppRoutes.activity` → `/activity` (audit log timeline UI)

---

## 6. Mobile behavior

- Bottom nav prioritizes health/attention/businesses/alerts path
- Tables become stacked calm cards (businesses, support, activity)
- Search fields full-width at top of list screens
- No squeezed desktop kanban or dark drawer

---

## 7. Accessibility

- Status uses dot + text + color (not color alone)
- Command palette: ↑↓ navigation, Enter, Esc
- Large touch targets on primary buttons (48px)
- `SelectableText` for technical health details
- Light theme default (`themeMode: ThemeMode.light` in `app.dart`)
- Browser zoom not disabled

---

## 8. Data sources

| Screen | API |
|--------|-----|
| Overview | `GET /platform/dashboard` |
| Health | `GET /platform/health` |
| Businesses | `GET /platform/businesses` |
| Business detail | `GET /platform/businesses/:id`, `.../branches` |
| Alerts | `GET /platform/notifications/stats`, `.../failed` |
| Support | `GET /platform/support-tickets` |
| Analytics | `GET /platform/analytics` |
| Activity | `GET /platform/audit-logs` (proxy for activity) |
| Feature flags | `GET /platform/feature-flags`, `PATCH .../global` |
| Settings | Local `appConfigProvider`, `currentUserProvider` |

**No fabricated:** revenue MRR, growth percentages, fake tickets, fake health, fake activity.

---

## 9. Error states

Human language throughout:

- "We couldn't load the platform overview."
- "We couldn't load businesses."
- "Your session has expired." (via existing auth interceptor)

All include **Try again** where applicable.

---

## 10. Empty states

| Screen | Empty message |
|--------|---------------|
| Businesses | "No businesses yet" |
| Alerts | "Everything looks good" |
| Support | "No open support requests" |
| Activity | "No recent activity" |
| Analytics breakdown | "Not available yet" |
| Feature flags | "No global flags" |

---

## 11. Tests

| Check | Result |
|-------|--------|
| `flutter test` | ✅ 10/10 pass (login tests + golden updated) |
| `flutter analyze` | ✅ No errors |
| `flutter build web -t lib/main_dev.dart` | ✅ Success |

---

## 12. Analyze

No analyzer errors after Phase 5 changes. Pre-existing info/warnings in unrelated files may remain.

---

## 13. Build

`flutter build web -t lib/main_dev.dart` — success.

---

## 14. Remaining backend limitations

1. **No `/platform/activity`** — Activity screen uses audit logs
2. **Business list** — no branch count, service modes, or waiting count per business in list API
3. **Business detail** — no per-business today metrics (customers served, avg wait)
4. **Needs attention** — derived from failed notifications + health; no unified alerts API
5. **Per-business feature flags** — API exists but no UI for overrides yet
6. **Revenue MRR** — explicitly null from dashboard API

---

## 15. Remaining UX issues

1. Branches, Users, Subscriptions, Audit screens still use legacy `AdminDataCard` / `AppCard`
2. Top bar shows static "Control center" healthy dot (not wired to live health on every page)
3. Business filter "Needs attention" not available — API supports `status` only (ACTIVE/INACTIVE)
4. Dark mode available in theme but admin defaults to light only

---

## 16. Ecosystem consistency

| App | Feeling |
|-----|---------|
| Customer | Warm and reassuring |
| Staff | Fast and stress-free |
| Owner | Calm and operational |
| **Super Admin** | **Calm and in control** |
| TV | (Phase 6) Clear from a distance |

Premium comes from clarity, spacing, typography, hierarchy, and human language — not more charts or gradients.

---

## 17. Recommended next phase

**Phase 6 — TV Display + secondary admin polish**

1. Calm redesign of TV display app
2. Migrate Branches / Users / Subscriptions to calm components
3. Wire top-bar health indicator to `systemHealthProvider`
4. Backend: unified platform attention API
5. Backend: business list enrichment (branches, service modes, health)
