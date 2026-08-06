# Staff App UX Redesign (Phase 2D)

## Persona

Receptionist / front-of-house staff operating the queue under time pressure. They need to know **how many are waiting**, **who is next**, and **what to do** — without training.

## Navigation

Bottom navigation (phone):

| Tab | Route | Purpose |
|-----|-------|---------|
| Today | `/` | Operational home — waiting count, Call Next |
| Customers | `/customers` | Search & customer detail |
| Alerts | `/notifications` | Actionable notifications |
| Profile | `/settings` embedded | Account + break mode |

Queue operations: `/queues/:id/console` (pushed from Today)

## Screen hierarchy

1. **Today** — hero waiting count, average wait, up-next preview, primary **Call Next** CTA
2. **Queue console** — card-based waiting list (phone), split list + detail (tablet)
3. **Call Next sheet** — animated handoff, customer details, Call / Seat / No show / Hold
4. **Customers** — large search, result cards with View action
5. **Customer detail** — hospitality-focused profile + contextual primary action
6. **Alerts** — categorized: Needs attention / Customer issue / Completed
7. **Break mode** — full-screen pause from Profile → Start break

## Components created

`apps/staff_app/lib/shared/widgets/staff/`:

- `staff_greeting.dart` — time-based greeting
- `staff_empty_states.dart` — empty, paused, closed, offline
- `staff_queue_entry_card.dart` — queue card with inline actions
- `staff_queue_timeline.dart` — operational journey indicator
- `call_next_sheet.dart` — Call Next modal flow

`apps/staff_app/lib/features/settings/break_mode_provider.dart` — break mode state

## Interaction principles

- **One primary action per screen** (Today → Call Next)
- Large touch targets, minimal typing
- Human language (parties waiting, not KPIs)
- Friendly errors — no stack traces
- Realtime: Live / Reconnecting / Updating (polling fallback)

## Responsive behavior

| Breakpoint | Queue console |
|------------|---------------|
| Phone | Vertical card list + sticky Call Next |
| Tablet+ | Queue list + customer detail panel |

## Realtime

Unchanged architecture: Socket.IO via `RealtimeClient` + `bindRealtimeRefresh` polling fallback every 10s.

## Testing

```bash
cd apps/staff_app
flutter analyze
flutter test
flutter build web
```

Tests: `test/staff_ux_test.dart` — greeting, journey mapping
