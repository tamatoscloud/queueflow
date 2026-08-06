# QueueFlow UX Contract

**Status:** Phase 6 — non-negotiable ecosystem rules  
**Applies to:** Customer Portal, Staff App, Business Owner App, Super Admin, TV Display, Marketing

This document defines what every QueueFlow surface must do. It is the enforcement layer on top of `docs/QUEUEFLOW_CALM_UX_SYSTEM.md`.

---

## Universal rules (all apps)

1. **No technical language** for operational users — no HTTP codes, sockets, APIs, tokens (except display codes in context), stack traces.
2. **No fabricated data** — if the API does not provide a metric, show an honest empty state.
3. **Errors answer three questions:** What happened? Is anything lost? What should I do?
4. **One dominant primary action** per operational screen — secondary and tertiary actions must be visually subordinate.
5. **Service-mode native copy** — dine-in, takeaway, and drive-in each use their own vocabulary (see Service Mode Contract below).
6. **Realtime language is standardized** (see Realtime Contract below).
7. **Loading never blanks operational context** — prefer skeleton, preserved data, or subtle updating indicator.
8. **Destructive actions require confirmation** — skip, no-show, cancel, pause/close queue, delete business, etc.
9. **Touch targets ≥ 48px** on phone operational actions.
10. **Demo content gated** — Bella Vista menu, fake reviews, demo-only copy behind `isRestaurantDemo()` or equivalent.

---

## STAFF contract

**Mindset:** "What do I need to do right now?"

| Rule | Requirement |
|------|-------------|
| Dominant action | Call Next is always obvious and thumb-reachable |
| Information order | Waiting count → Next up → actions. No analytics before operations |
| Mode context | Service mode visible on every queue surface |
| Customer context | Name, party/order/vehicle, wait time visible without drilling in |
| Language | Plain hospitality terms — "No show" not "SKIP_ENTRY" |
| Errors | Tell staff what to do: retry, refresh, sign in again |
| Call Next feedback | "Calling…" then "Sarah has been called" — never ambiguous spinner |
| Confirmations | Skip/no-show, hold (optional), transfer — confirm before irreversible |
| Realtime | ● Live / ● Reconnecting… / ● Updating… in header |
| No | KPI cards, glass panels, dual competing primary CTAs, developer settings on Today |

---

## OWNER contract

**Mindset:** "Is my restaurant running well?"

| Rule | Requirement |
|------|-------------|
| 5-second health | Waiting now + average wait visible above the fold |
| Information order | Waiting → needs attention → service modes → shortcuts. Analytics last |
| Queue console | Same operational clarity as staff — Call Next sticky, sections not kanban |
| Language | "Average wait" not "Avg service duration"; "Parties" or mode-appropriate units |
| Errors | Human messages on all owner paths including branches |
| Developer tools | Hidden under Settings → Advanced only |
| No | MetricCard grids, executive dashboard headers, fake revenue, technical queue IDs |
| Realtime | Subtle ● Live on dashboard and queue surfaces |
| Confirmations | Pause queue confirmed; close queue confirmed; skip/no-show confirmed |

---

## CUSTOMER contract

**Mindset:** "Don't worry — we know you're waiting."

| Rule | Requirement |
|------|-------------|
| Orientation | Customer always knows: where they are, how long they may wait, what happens next |
| Language | "Your table is ready" / "Your order is ready" / "We're coming to your car" — mode-specific |
| No internal terms | Never "CALLED", "WAITING", "entry", "queue engine" |
| Join CTA | Mode-appropriate labels (join queue, track order, join drive-in) |
| Demo safety | Menu browse, fake ratings, demo specials only for demo restaurants |
| Errors | Calm, reassuring — connection issues explain data is still visible |
| Realtime | Subtle banner when disconnected — not alarming |
| No | Dashboards, tabs, technical status badges, fake menu for real restaurants |

---

## ADMIN contract

**Mindset:** "Is the platform healthy, and who needs attention?"

| Rule | Requirement |
|------|-------------|
| Information order | Platform health → needs attention → businesses → support |
| Technical details | Collapsed — expandable rows, never dominate first view |
| Language | "Healthy", "Needs attention", "Degraded" — not ERROR_500 |
| No | MetricCard rainbow dashboards, dark developer console, fake analytics |
| Businesses | Scannable cards — name, status, branches. No UUIDs in primary view |
| Realtime | N/A for most admin (REST refresh). Health from `/platform/health` |

---

## TV contract

**Mindset:** "What number is being served?"

| Rule | Requirement |
|------|-------------|
| Readability | Token and status readable from several meters |
| Dominant info | NOW SERVING + token number largest on screen |
| Connection | Subtle banner — "Updating…" not "Socket disconnected" |
| No | Dense tables, small text, technical errors on public display |
| Mode | Section labels match service mode (parties / orders / cars) |

---

## MARKETING contract

| Rule | Requirement |
|------|-------------|
| Truth | Every CTA works; every claim matches product reality |
| Pricing | Must match backend plans or clearly say "Contact us" |
| Features | Do not claim push notifications, analytics depth, etc. unless shipped |
| Demo names | Bella Vista only in demo context, not as fake testimonial for production |

---

## Service mode terminology contract

Single source of truth:

| Concept | DINE_IN | TAKEAWAY | DRIVE_IN |
|---------|---------|----------|----------|
| Waiting unit | parties / people | orders | cars |
| Identity | name + party size | order # + name | vehicle + plate |
| Ready message | table ready / your table is ready | order ready / collect | coming to your car |
| Complete action | Seat / Complete | Mark collected | Serve |
| Call next | Call next party | Call next order | Call next car |
| Never use | order, pickup counter for dine-in | party, table, seat | party, table, order |

**Canonical implementations:**
- Web: `apps/customer-portal/src/lib/restaurant/service-mode-config.ts`
- Flutter staff: `apps/staff_app/lib/shared/widgets/staff/service_mode_helpers.dart`
- Flutter owner: `apps/business_app/lib/features/restaurant_demo/presentation/service_mode_helpers.dart` *(must move to shared path — Phase 6 P0)*

---

## Realtime contract

| State | Label | When |
|-------|-------|------|
| Connected | ● Live | Socket connected |
| Reconnecting | ● Reconnecting… | Socket dropped, retrying |
| Fallback | ● Updating… | Polling or loading refresh |
| Stale (optional) | Information may be outdated | Extended disconnect with cached data |

**Never show:** socket, websocket, HTTP, API, polling, exception class names.

---

## Error message contract

### Template

```
[What happened — plain language]

[Reassurance if data preserved]

[Action button]
```

### Examples

| Bad | Good |
|-----|------|
| SocketException | We're having trouble updating. Your queue is still visible. |
| 401 Unauthorized | Your session has expired. Sign in again. |
| 500 Internal Server Error | We couldn't load your queues. Try again. |
| `$e` in Flutter | Use `apiExceptionMessage(e)` or static friendly string |

---

## Primary action hierarchy

| Level | Visual treatment | Examples |
|-------|------------------|----------|
| **PRIMARY** | Full-width violet button, 48–56px, one per screen region | Call Next, Join queue, Sign in |
| **SECONDARY** | Outline or text button | Add customer, View queue |
| **TERTIARY** | Icon or link | Settings, Refresh |

Maximum **one PRIMARY** per visible screen region (header, sticky footer, modal).

---

## Confirmation policy

| Action | Confirm? |
|--------|----------|
| Call Next | No — but show feedback toast/state |
| Complete / Seat / Collect / Serve | No |
| Hold | Optional lightweight confirm |
| Skip / No-show | **Yes** |
| Pause queue | **Yes** |
| Close queue | **Yes** |
| Cancel entry | **Yes** |
| Delete business | **Yes** |
| Transfer | **Yes** (dialog) |

---

## Enforcement

- New screens must pass the 2-second test from `QUEUEFLOW_CALM_UX_SYSTEM.md`
- PRs that add `MetricCard`, `GlassPanel`, or raw `$e` to operational paths should be rejected
- Service-mode copy changes must update all three canonical helper files
- Demo content must use `isRestaurantDemo()` or explicit demo route
