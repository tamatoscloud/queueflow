# QueueFlow — Calm Premium UX Implementation Plan

**Companion to:** `docs/QUEUEFLOW_CALM_UX_SYSTEM.md`  
**Status:** Phase 1 + 1B complete  
**Rule:** Frontend only — preserve APIs, auth, realtime, queue engine, service modes.

---

## 1. Current architecture

### Monorepo apps

| App | Path | Stack | Persona |
|-----|------|-------|---------|
| Customer portal | `apps/customer-portal` | Next.js 15, Tailwind | Guest |
| Staff | `apps/staff_app` | Flutter, Riverpod, go_router | Receptionist |
| Business owner | `apps/business_app` | Flutter | Owner / manager |
| Super admin | `apps/admin_panel` | Flutter | Platform ops |
| TV display | `apps/tv_display` | Flutter | Public |
| Marketing | `apps/marketing_website` | Flutter web | Prospect |

Legacy `apps/customer_app` — do not invest.

### Shared packages

| Package | Role |
|---------|------|
| `packages/theme` | `AppColors`, `AppTypography`, `AppSpacing`, `AppMotion`, `ProductTheme`, `ProductIdentity` |
| `packages/ui` | `AppButton`, `AppCard`, `GlassPanel`, `AppBadge`, `AppTextField` |
| `packages/widgets` | `AnimatedCounter`, `ScoreRing`, `MetricCard`, `EmptyStateView`, `PageLoading` |
| `packages/network` | API client, exceptions |
| `packages/services` | Storage, connectivity |

Customer portal mirrors tokens in `apps/customer-portal/src/app/globals.css`.

### Staff app structure

```
apps/staff_app/lib/
├── features/
│   ├── today/today_screen.dart          ← Phase 1 focus
│   ├── queue_console/                   ← Phase 1 follow-up
│   ├── customers/
│   ├── notifications/
│   ├── profile/
│   └── shell/staff_shell.dart
├── shared/widgets/
│   ├── staff/                           ← operational widgets
│   └── calm/                            ← NEW calm premium primitives
└── core/                                ← API, realtime, models (unchanged)
```

### Realtime (unchanged)

- `RealtimeClient` + Socket.IO
- `bindRealtimeRefresh` polling fallback (~10s)
- `RealtimeStatusChip`: Live / Connecting / Reconnecting / Updating

### Service mode config

| Location | Used by |
|----------|---------|
| `staff_app/.../service_mode_helpers.dart` | Staff Flutter |
| `customer-portal/.../service-mode-config.ts` | Customer Next.js |

Keep terminology aligned (see §8).

---

## 2. Existing reusable components

### Retain (extend styling only)

| Component | Package / path | Notes |
|-----------|----------------|-------|
| `AnimatedCounter` | `packages/widgets` | Waiting count animation |
| `AppButton` | `packages/ui` | Secondary/outline actions |
| `AppBadge` | `packages/ui` | Status pills |
| `RealtimeStatusChip` | `staff_app/common_widgets` | Live indicator |
| `StaffQueueEntryCard` | `staff_app/staff` | Queue console cards |
| `call_next_sheet.dart` | `staff_app/staff` | Redesign in Phase 1 |
| `service_mode_helpers.dart` | `staff_app/staff` | Extend labels |
| `PageLoading`, `PageError` | `packages/widgets` | Loading states |
| `staff_empty_states.dart` | `staff_app/staff` | Empty/offline/paused |

### Customer portal (Phase 2)

| Retain | Redesign |
|--------|----------|
| `BookingShell`, `BookingRegistration` | ✅ light join |
| `LightWaitingExperience`, `LightReadyExperience` | ✅ track |
| `waiting-experience.tsx`, `queue-join-experience.tsx` | Deprecate after migration |
| `service-mode-config.ts` | Extend to all screens |

---

## 3. Components to create (staff Phase 1)

| Component | Path | Purpose |
|-----------|------|---------|
| `CalmCard` | `staff_app/.../calm/calm_card.dart` | Soft bordered surface |
| `CalmPrimaryButton` | `staff_app/.../calm/calm_primary_button.dart` | Sticky Call Next CTA |
| `CalmSectionLabel` | `staff_app/.../calm/calm_section_label.dart` | WAITING NOW / UP NEXT |
| `CalmServiceModeRow` | `staff_app/.../calm/calm_service_mode_row.dart` | Mode breakdown |
| `CalmLiveIndicator` | `staff_app/.../calm/calm_live_indicator.dart` | ● Live pill |

**Future (packages/ui migration):** promote calm primitives to `packages/ui` after staff validation.

---

## 4. Components to consolidate

| Duplicates | Action |
|------------|--------|
| `GlassPanel` on staff Today | Replace with `CalmCard` |
| Dual `Call Next` (inline + sticky) | Sticky only |
| Per-mode `Call Next` in service overview | Remove — sticky handles primary |
| Customer dark + light components | Phase 2: single light system |
| `AnimatedCounter` TS + Dart | Keep both; sync duration via `AppMotion.counter` |

---

## 5. Screen-by-screen redesign plan

### Phase 1 — Staff (this sprint)

| Screen | Priority | Changes |
|--------|----------|---------|
| **Today** | P0 | Calm hierarchy: header → waiting now → up next → sticky Call Next → secondary actions → service modes |
| **Call Next sheet** | P0 | Named calling state, labeled actions (Seat/Hold/No show/Call again), calm surfaces |
| Queue console | P1 | Large cards phone; split tablet |
| Customer detail | P2 | Hospitality copy |
| Alerts | P2 | Deep-link to console |
| Profile | P3 | Calm surfaces |

### Phase 2 — Customer portal

All routes → `BookingShell` + light components; mode-aware copy; remove demo leakage.

### Phase 3 — Owner

Dashboard calm KPIs; hide developer tools; QR center polish.

### Phase 4 — Admin

`ProductIdentity` branding; mobile More menu; progressive health disclosure.

### Phase 5 — TV

NOW SERVING typography; operator-only errors.

### Phase 6 — Marketing

Editorial serif hero; hospitality photography.

---

## 6. Persona-specific UX rules (quick reference)

| Persona | Primary question | Primary CTA | Avoid |
|---------|------------------|-------------|-------|
| Staff | Who is next? | Call Next | Charts, KPIs, glass overload |
| Customer | Where am I in line? | Confirm / passive wait | Dashboards, jargon |
| Owner | How is business doing? | View queue | Dev tools in nav |
| Admin | Is platform healthy? | — | Raw infra strings on surface |
| TV | Who is being served? | — | Technical errors public |

---

## 7. Design token mapping

### Calm palette (add to `AppColors`)

| Token | Hex | Flutter | CSS (customer) |
|-------|-----|---------|----------------|
| Calm ivory | `#FCFAF7` | `AppColors.calmIvory` | `--calm-ivory` |
| Calm violet | `#8B7CF8` | `AppColors.calmViolet` | `--calm-violet` |
| Calm lilac | `#EAE5F8` | `AppColors.calmLilac` | `--calm-lilac` |
| Calm peach | `#F9DDC7` | `AppColors.calmPeach` | `--calm-peach` |
| Calm charcoal | `#17151A` | `AppColors.calmCharcoal` | `--calm-charcoal` |
| Calm warm gray | `#6B6870` | `AppColors.calmWarmGray` | `--calm-warm-gray` |
| Calm border | `#E8E3E8` | `AppColors.calmBorder` | `--calm-border` |

### ProductIdentity.staff

- **Before:** Teal (`AppColors.secondary`)
- **After:** Calm violet (`AppColors.calmViolet`) — aligns with customer brand, staff stays calm via whitespace

### Typography

| Role | Staff (Phase 1) | Future |
|------|-----------------|--------|
| Display | `headlineMedium` w800 for hero numbers | Playfair via `google_fonts` |
| Body | Inter (`AppTypography`) | unchanged |

---

## 8. Service mode terminology

| | DINE_IN | TAKEAWAY | DRIVE_IN |
|---|---------|----------|----------|
| Waiting unit | people | orders | cars |
| Complete action | Seat | Collected | Serve |
| Call next CTA | Call next party | Call next order | Call next car |

Source of truth (staff): `service_mode_helpers.dart`.

---

## 9. Responsive strategy

| Breakpoint | Staff Today |
|------------|-------------|
| Phone | Single column; sticky bottom Call Next (64px); 48px+ touch targets |
| Tablet | Wider padding; sticky bar centered max-width 480px |

---

## 10. Implementation phases & gates

### Phase 1 gate (staff)

```bash
cd apps/staff_app
flutter analyze
flutter test
flutter build web
```

Must pass before Phase 2.

### Regression checklist

- [ ] Call Next API still works
- [ ] Seat / Hold / No show actions work
- [ ] Realtime refresh on Today
- [ ] Offline / error states honest
- [ ] Multi-queue + multi-mode breakdown correct
- [ ] Break mode unchanged

---

## 11. Phase 1 file manifest

| Action | File |
|--------|------|
| Create | `docs/QUEUEFLOW_CALM_UX_IMPLEMENTATION.md` |
| Extend | `packages/theme/lib/src/tokens/app_colors.dart` |
| Update | `packages/theme/lib/src/product_identities.dart` |
| Create | `apps/staff_app/lib/shared/widgets/calm/*.dart` |
| Redesign | `apps/staff_app/lib/features/today/today_screen.dart` |
| Redesign | `apps/staff_app/lib/shared/widgets/staff/call_next_sheet.dart` |
| Update | `apps/staff_app/lib/shared/widgets/staff/staff_greeting.dart` |
| Update | `apps/staff_app/lib/shared/widgets/staff/service_mode_helpers.dart` |
| Update | `apps/staff_app/lib/app.dart` |

### Phase 1B — Queue Console (complete)

| Action | File |
|--------|------|
| Create | `calm_status_badge.dart` |
| Create | `calm_queue_entry_card.dart` |
| Create | `calm_queue_console.dart` (header, detail panel, sticky action, skeleton, empty) |
| Redesign | `queue_console_screen.dart` |

---

## 12. Next action

Phase 1B complete. **Next:** Phase 2 — Customer portal light system across all routes.
