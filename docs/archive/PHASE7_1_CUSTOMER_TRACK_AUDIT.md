# Phase 7.1 — Customer Track Calm Consolidation Audit

**Date:** August 2026  
**Status:** Audit complete — **no UI code changed yet**  
**Scope:** Customer portal `/track/[entryId]` and related track journey surfaces only  
**Goal:** One continuous Calm experience from Landing → Join → Track → Ready → Completed → Feedback

---

## Executive summary

The customer portal active journey is **mostly Calm** on landing, join, completed, feedback, and ended states. The **track screen is the remaining fracture point**: it routes through `LightWaitingExperience` and `LightReadyExperience` — hybrid components that use Calm primitives but omit key reassurance patterns from the legacy `WaitingExperience`, retain hardcoded hex styling, and duplicate/conflict realtime indicators.

**Primary recommendation:** Build a unified `CalmTrackExperience` + `CalmReadyExperience` by **migrating and restyling** existing waiting subcomponents (journey timeline, wait progress, need-help, notifications) into the Calm token system — not by redesigning from scratch and not by switching back to the dark/glass legacy stack.

**P0 for implementation (blocks calm continuity):** 6 items  
**P1 (significant friction):** 8 items  
**P2 (polish):** 7 items  
**P3 (optional):** 4 items

---

## 1. Route & component map

### Active track route

| Route | Page | Experience component | Shell |
|-------|------|---------------------|-------|
| `/track/[entryId]` | `app/track/[entryId]/page.tsx` | `LightWaitingExperience` (WAITING/HOLDING) | `BookingShell` |
| | | `LightReadyExperience` (CALLED) | `BookingShell` |
| | | `CalmWelcomeBanner` (welcome query param) | `BookingShell` |
| | | `QueueEnded` → `CalmEnded` (CANCELLED/SKIPPED/NO_SHOW) | `BookingShell` |
| | | Redirect → `/completed/[entryId]` (COMPLETED) | — |
| | | `CalmSkeleton` / `CalmError` (loading/error) | `BookingShell` |

### Adjacent journey routes (already Calm)

| Route | Component | Status |
|-------|-----------|--------|
| `/q/[queueId]` | `CalmLanding` | ✅ Calm |
| `/q/[queueId]/join` | `BookingRegistration` (light fields + calm primitives) | ✅ Mostly Calm |
| `/completed/[entryId]` | `CalmCompleted` | ✅ Calm |
| `/feedback/[entryId]` | `CalmFeedback` | ✅ Calm |
| `/offline` | `CalmOffline` | ✅ Calm |

### Not routed (legacy / dead)

| Component | Referenced by | Action |
|-----------|---------------|--------|
| `waiting/waiting-experience.tsx` | `waiting-experience.test.tsx` only | Migrate useful parts → delete |
| `waiting/table-ready-experience.tsx` | tests only | Delete after CalmReady ships |
| `components/queue/waiting-experience.tsx` | nothing | Safe to delete |
| `visit-completed.tsx` | nothing | Safe to delete |
| `feedback-experience.tsx` | nothing | Safe to delete (superseded by `CalmFeedback`) |
| `join-wizard.tsx` | nothing | Safe to delete |
| `table-ready.tsx`, `success-celebration.tsx` | success route remnants | Delete with success route cleanup (P2) |
| `restaurant-landing.tsx`, `takeaway-landing.tsx`, `drive-in-landing.tsx` | branch routes may still use | Out of Phase 7.1 scope |

---

## 2. Current track screen hierarchy audit

### What the customer sees today (Light waiting)

```
BookingShell header (venue + STATIC green "Live" pill)
  └─ CalmWelcomeBanner (optional, first visit)
  └─ LightWaitingExperience
       1. Restaurant name + CalmLivePill (connection-aware)     ← duplicate live indicator
       2. Headline (heroSubtitle / almostTitle) + exclamation
       3. Hourglass ring with large minute number               ← dominant metric
       4. Ahead count + wait text
       5. CalmDigitalPass (token, context, ahead, wait, live)   ← good
       6. While you wait (branch card + demo menu if demo)
       7. Stay in the loop (browser notify + WhatsApp card)
       8. Need help (inline, no contact details)
```

### Spec hierarchy (target)

```
1. Restaurant identity
2. Current status
3. Token / order / vehicle context
4. Main waiting information
5. What happens next
6. Optional helpful information
7. Secondary actions
```

### Gap analysis

| Spec layer | Current | Gap | Priority |
|------------|---------|-----|----------|
| Restaurant identity | Name in header + pass | Branch not in header; shell title duplicates | P2 |
| Current status | Headline from `copy.heroSubtitle` | No explicit status line ("You're in the queue") separate from emotional headline | P1 |
| Token / context | CalmDigitalPass | ✅ Good; order/vehicle context wired | — |
| Main waiting info | Hourglass + ahead + minutes | Works but minute number may feel like countdown pressure | P2 |
| What happens next | `copy.joinNotifyMessage` subtext only | **Missing journey timeline** | **P0** |
| Optional helpful | While-you-wait section | Missing wait progress ("you've made it"); generic branch card | P1 |
| Secondary actions | Notifications + need help | Enable button <48px; no real contact info | P1 |

---

## 3. Ready state audit (`LightReadyExperience`)

### Current behavior

- Triggered when `entry.status === 'CALLED'` only
- Uses `copy.readyTitle`, `copy.readyDescription(branchName)`, `copy.readyHoldMessage`
- Hold countdown from `calledAt` via `tableHoldSecondsRemaining` — **real data, not fabricated** ✅
- Shows display code + dine-in party context only
- Hardcoded `CalmLivePill label="Live"` — **not connection-aware** (P1)
- No takeaway order # or drive-in vehicle on ready card (P1)
- No confetti — **correct per Phase 7.1 motion rules** ✅

### Service-mode ready copy (verified in `service-mode-config.ts`)

| Mode | readyTitle | readyDescription | Status |
|------|------------|------------------|--------|
| DINE_IN | Your table is ready! | Proceed to reception at {branch} | ✅ |
| TAKEAWAY | Your order is ready! | Collect at counter | ✅ |
| DRIVE_IN | We're coming to your car! | Remain in vehicle | ✅ |

### Gap vs legacy `TableReadyExperience`

| Feature | Legacy | Light/Calm | Action |
|---------|--------|------------|--------|
| Confetti | Yes | No | Keep no confetti |
| TokenDisplay component | Yes | Plain text in CalmCard | OK |
| Hold timer | Yes | Yes | OK |
| Mode context on card | Partial | Dine-in party only | Add order/vehicle |

---

## 4. Ended & terminal states

| Status | Handler | Component | Calm? |
|--------|---------|-----------|-------|
| CANCELLED | track page | `CalmEnded` variant=cancelled | ✅ |
| SKIPPED | track page | `CalmEnded` variant=skipped | ✅ |
| NO_SHOW | track page | `CalmEnded` variant=no_show | ✅ |
| COMPLETED | redirect | `CalmCompleted` | ✅ |
| EXPIRED | — | Not in `EntryStatus` type | N/A (backend doesn't expose) |
| HOLDING | falls through | Shown as waiting | Acceptable |
| Queue CLOSED while waiting | — | No dedicated track UI | P2 — may show stale waiting |

`CalmEnded` uses mode-aware copy from `getServiceModeCopy().ended` — **verified correct for all three modes**.

---

## 5. Service-mode terminology audit

### Source of truth

`apps/customer-portal/src/lib/restaurant/service-mode-config.ts` — all active track/light/calm paths import from here.

### Active track path verification

| Check | DINE_IN | TAKEAWAY | DRIVE_IN | Result |
|-------|---------|----------|----------|--------|
| Ahead labels | parties ahead | orders ahead | cars ahead | ✅ |
| heroSubtitle | You're in the queue | Your order is being prepared | Stay in your vehicle | ⚠️ Takeaway subtitle differs from spec ("Your order is in line") — P2 copy tweak only |
| almostTitle | Almost your turn | Almost ready | You're almost next | ✅ |
| readyTitle | Your table is ready! | Your order is ready! | We're coming to your car! | ✅ |
| Digital pass party line | Party of N | hidden | hidden | ✅ |
| Context line (order/vehicle) | null | Order #N | vehicle/plate | ✅ |
| Need help copy | display code at reception | same generic | same generic | P1 — mode-specific help copy |

### Cross-mode language risk

- **No active track path** renders "table ready" on takeaway or drive-in ✅
- Legacy `waiting-experience.test.tsx` tests dine-in only — not routed
- `WhileYouWait` legacy component uses generic "your turn" — not used on active track path

---

## 6. Realtime UX audit

### Standard (UX Contract)

| State | Required label |
|-------|----------------|
| Connected | ● Live |
| Reconnecting | ● Reconnecting… |
| Fallback | ● Updating… |
| Stale | Information may be outdated |

### Current implementations on track journey

| Location | Behavior | Compliant? |
|----------|----------|------------|
| `formatConnectionLabel()` | Live / Reconnecting… / Updating… / Offline | ⚠️ "Offline" not in contract |
| `CalmLivePill` in LightWaiting header | Uses `formatConnectionLabel` | ✅ (except Offline label) |
| `CalmDigitalPass` | Duplicate pill | P2 — redundant |
| `BookingShell` `showJazzPill` | **Always green "Live"** regardless of connection | **P0 — misleading** |
| `RealtimeStatusBanner` (root layout) | "Using backup refresh", "Offline — showing last known data" | **P0 — technical language on customer app** |
| `LightReadyExperience` | Hardcoded "Live" | **P1** |
| Track page on disconnect | Preserves snapshot via React Query | ✅ Does not blank |

### Data refresh architecture (unchanged in Phase 7.1)

- `useEntryTracking`: socket subscription + 15s polling fallback
- `useRealtimeConnection`: connection state for UI only
- **Do not change** — UI labels only

---

## 7. Loading & error states

| State | Component | Behavior | Compliant? |
|-------|-----------|----------|------------|
| Initial load | `CalmSkeleton` in `BookingShell` | Skeleton, not full-screen spinner | ✅ |
| Fetch error | `CalmError` + `friendlyTrackingError` | Human message + retry | ✅ |
| Realtime refresh | Query cache update | Screen not blanked | ✅ |
| Stale data indicator | None on track when disconnected | Missing subtle stale message | P1 |

---

## 8. Visual system audit

### Calm tokens in use (active track)

| Token | Calm spec | Track implementation |
|-------|-----------|---------------------|
| Background | Warm ivory `#faf8f5` | `BookingShell`, hourglass center | ✅ |
| Primary violet | `#8b7cf8` | Hardcoded in components | ⚠️ P2 — use CSS vars from `.booking-light` |
| Lilac surface | `#f5f3ff` | `CalmCard highlighted` | ✅ |
| Borders | `#e8e3e8` | CalmCard, shell | ✅ |
| Typography | `font-display` Playfair | Headlines use font-display | ✅ |
| Shadows | Subtle | CalmCard minimal; legacy `glass` not on active path | ✅ |

### Legacy visual patterns still visible on track

| Pattern | Where | Priority |
|---------|-------|----------|
| Hardcoded hex colors | `light-waiting-experience.tsx`, `light-ready-experience.tsx` | P2 |
| `booking-hourglass-ring` conic gradient | waiting hero | P2 — keep shape, calm styling |
| Exclamation accent on every headline | `headline.replace + violet !` | P2 — reduce noise |
| Duplicate restaurant name (shell + content) | BookingShell + header | P2 |

### Legacy patterns in unused `WaitingExperience` (do not ship as-is)

- `glass` morphism panels
- `RealtimeIndicator` uppercase badge style (different from CalmLivePill)
- `AnimatedCounter` on position (motion-heavy)
- Gradient `AlmostYourTurn` card with Sparkles

---

## 9. Motion audit

| Element | Current | Spec | Action |
|---------|---------|------|--------|
| Hourglass ring progress | Updates on ahead change | Allowed — communicates progress | Keep, subtle |
| Hold countdown (ready) | 1s interval tick | Allowed — customer needs to act | Keep |
| AnimatedCounter | Legacy only | Avoid aggressive counters | Do not add to calm track |
| Confetti | Legacy table-ready only | Avoid during normal waiting | Do not add |
| Welcome banner | Static card | Subtle welcome transition | OK |

**30-minute comfort:** No continuous floating animation on active track path ✅

---

## 10. Mobile & accessibility audit

### Viewport

- `layout.tsx`: `width: device-width, initialScale: 1` — **no maximumScale lock** ✅

### Touch targets

| Control | Size | Compliant? |
|---------|------|------------|
| CalmButton (elsewhere) | h-14 (56px) | ✅ |
| Browser notify Enable | `px-3 py-1 text-xs` | **❌ ~28px — P1** |
| Welcome "Got it" | text-xs link | **❌ P2** |
| Need help | text only, no expand on light path | P2 |

### Horizontal scroll

- Active light path: no horizontal scroll on essential info ✅
- Legacy `WhileYouWait`: horizontal scroll cards — not on active path

### Semantics

| Item | Status |
|------|--------|
| `role="status"` on ready | ✅ |
| `aria-live` on ready | ✅ assertive — appropriate |
| Journey timeline `aria-current="step"` | In legacy component — **missing on active path P0** |
| Heading hierarchy | h1 headline, h2 restaurant — OK |

### Reduced motion

- No `prefers-reduced-motion` guards on hourglass or countdown | P2

---

## 11. Subcomponent inventory & migration plan

### Reuse (restyle to Calm, wire into unified track)

| Component | File | Value | Migration |
|-----------|------|-------|-----------|
| QueueJourneyTimeline | `waiting/queue-journey-timeline.tsx` | Shows what happens next | Replace `glass` → `CalmCard`; use calm colors |
| WaitProgress | `waiting/wait-progress.tsx` | "You've made it" progress | Replace `glass` + ProgressRing styling |
| SmartWaitMessage | `waiting/smart-wait-message.tsx` | Reassuring copy from API state | Calm typography |
| AlmostYourTurn | `waiting/almost-your-turn.tsx` | Almost state emphasis | Remove gradient/sparkles; calm highlight card |
| NotificationStatus | `waiting/notification-status.tsx` | SMS/WhatsApp reassurance | Replace glass → CalmCard |
| NeedHelp | `waiting/need-help.tsx` | Expandable help | Calm styling; honest "no contact" fallback |
| CalmDigitalPass | `calm/calm-digital-pass.tsx` | Already calm | Keep; remove duplicate live pill (P2) |

### Do not reuse as-is

| Component | Reason |
|-----------|--------|
| QueueWalletPass | Glass gradient wallet — superseded by CalmDigitalPass |
| QueuePositionHero | Dual giant numbers — redundant with hourglass + pass |
| QueuePositionLadder | Dense position ladder — optional P2; may omit to reduce cognitive load |
| RealtimeIndicator | Wrong visual language vs CalmLivePill |
| WelcomeOverlay | Superseded by CalmWelcomeBanner |

### Rename strategy (implementation)

```
light-waiting-experience.tsx  →  calm-track-experience.tsx (or merge into calm/)
light-ready-experience.tsx    →  calm-ready-experience.tsx
```

Update `track/[entryId]/page.tsx` imports only — **no route changes**.

---

## 12. Demo content safety

| Content | Gated? | Location |
|---------|--------|----------|
| Browse menu card | `isRestaurantDemo(business.name)` | `light-waiting-experience.tsx` | ✅ |
| MENU_TIPS | demo helper only | `restaurant-content.ts` | ✅ |
| Branch "Relax nearby" | Real branch name from API | Always shown | ✅ honest |
| Restaurant phone in help | Not shown | — | ✅ no fabrication |
| Fake wait times | From API `estimatedWaitMinutes` | — | ✅ |

---

## 13. Real data honesty

| Field | Source | Fallback if missing |
|-------|--------|---------------------|
| customersAhead | API | 0 → "You're next!" |
| estimatedWaitMinutes | API | 0 → "Any moment now" |
| displayCode | API | required |
| orderNumber / vehicle | entry.metadata | hidden if absent |
| calledAt / hold timer | API | default 5 min hold |
| branch.name | API | shown |
| business phone | not in tracking API | do not fabricate — P1 add honest empty state in NeedHelp |
| wait duration on completed | computed from joinedAt/calledAt | hidden if unavailable |

---

## 14. Rush-hour & edge-case matrix

| Scenario | Current UX | Safe? | Fix priority |
|----------|------------|-------|--------------|
| 25 people waiting, position 22 | Large minute number + "22 parties ahead" | Readable but anxiety-inducing | P2 soften copy |
| Realtime disconnect mid-wait | Snapshot preserved; banner says "backup refresh" | Data OK; language bad | **P0** |
| CALLED, customer away | Ready + hold countdown | ✅ | — |
| Queue paused (customer view) | No explicit paused UI | May show stale wait | P2 |
| Long wait 30+ min | Hourglass static, no annoying animation | ✅ comfortable | — |
| Returning customer | Session on join; track uses entryId | ✅ | — |
| SKIPPED / NO_SHOW | CalmEnded | ✅ | — |
| Welcome overlay + shell live pill | Two welcome patterns possible | Minor confusion | P2 |

---

## 15. Testing impact

| Test file | Covers | Action after implementation |
|-----------|--------|----------------------------|
| `light-experience.test.tsx` | LightWaiting/Ready | Rename → `calm-track-experience.test.tsx`; update imports |
| `waiting-experience.test.tsx` | Legacy WaitingExperience | Delete or migrate assertions to calm track tests |
| `customer-journey.spec.ts` (E2E) | Full journey including track | Verify ready copy per mode; no selector changes expected |
| `service-mode-config` tests | Copy | Unchanged unless P2 takeaway subtitle |

### Commands (post-implementation)

```bash
cd apps/customer-portal
npm test
npm run typecheck
npm run build
# optional if backend running:
npm run test:e2e
```

---

## 16. Implementation backlog (prioritized)

### P0 — blocks calm continuity / demo truthfulness

| # | Item | Files |
|---|------|-------|
| 1 | Replace `LightWaitingExperience` + `LightReadyExperience` with unified Calm track components | new `calm/calm-track-experience.tsx`, `calm/calm-ready-experience.tsx`, `track/page.tsx` |
| 2 | Add **QueueJourneyTimeline** (calm-styled) to active track — customer must see what happens next | migrate `queue-journey-timeline.tsx` |
| 3 | Fix **BookingShell static Live pill** — bind to `useRealtimeConnection` or remove | `booking-shell.tsx`, `track/page.tsx` |
| 4 | Fix **RealtimeStatusBanner** customer-facing language — no "backup refresh" / technical terms | `realtime-status-banner.tsx` |
| 5 | Ready state: show **order/vehicle context** on ready card (same as digital pass) | calm-ready-experience |
| 6 | Ready state: **connection-aware** live pill | calm-ready-experience |

### P1 — significant friction

| # | Item |
|---|------|
| 7 | Add **WaitProgress** (calm-styled) — secondary reassurance |
| 8 | Add **SmartWaitMessage** or calm almost-state card when ≤2 ahead |
| 9 | Migrate **NeedHelp** — expandable, honest contact fallback |
| 10 | Migrate **NotificationStatus** — replace inline notify section |
| 11 | Browser notify button → **min 48px** touch target |
| 12 | Subtle **stale data** message when disconnected (not alarming) |
| 13 | Map `formatConnectionLabel` "Offline" → UX-contract wording |
| 14 | Remove duplicate live indicator (shell vs header vs pass) — pick one primary |

### P2 — polish

| # | Item |
|---|------|
| 15 | Replace hardcoded hex with `.booking-light` CSS variables |
| 16 | Takeaway `heroSubtitle` → "Your order is in line" (copy-only) |
| 17 | `prefers-reduced-motion` for hourglass/countdown |
| 18 | Welcome "Got it" → CalmButton |
| 19 | Delete dead components (see §17) |
| 20 | Optional: QueuePositionLadder as progressive disclosure |

### P3 — optional

| # | Item |
|---|------|
| 21 | Queue paused customer messaging (needs API signal audit) |
| 22 | CSS var extraction to shared calm tokens doc |
| 23 | Playwright track assertions per service mode |
| 24 | Success route / PageShell cleanup (out of track scope) |

---

## 17. Legacy cleanup candidates (post-implementation)

| File | References | Tests | Verdict |
|------|------------|-------|---------|
| `visit-completed.tsx` | none | none | **DELETE** |
| `feedback-experience.tsx` | none | none | **DELETE** |
| `join-wizard.tsx` | none | none | **DELETE** |
| `components/queue/waiting-experience.tsx` | none | none | **DELETE** |
| `waiting/waiting-experience.tsx` | tests only | yes | **DELETE** after test migration |
| `waiting/table-ready-experience.tsx` | tests only | yes | **DELETE** after CalmReady tests |
| `light/light-waiting-experience.tsx` | track page, tests | yes | **DELETE** after rename |
| `light/light-ready-experience.tsx` | track page, tests | yes | **DELETE** after rename |
| `waiting/queue-wallet-pass.tsx` | legacy waiting only | no | **DELETE** |
| `table-ready.tsx`, `success-celebration.tsx` | success route | no | P2 — separate cleanup |

**Do not delete** `waiting/queue-journey-timeline.tsx`, `wait-progress.tsx`, `need-help.tsx`, etc. — migrate into calm track.

---

## 18. Files expected to change (implementation preview)

| File | Change type |
|------|-------------|
| `app/track/[entryId]/page.tsx` | Import calm track/ready |
| `components/customer/calm/calm-track-experience.tsx` | **NEW** |
| `components/customer/calm/calm-ready-experience.tsx` | **NEW** |
| `components/customer/waiting/queue-journey-timeline.tsx` | Restyle |
| `components/customer/waiting/wait-progress.tsx` | Restyle |
| `components/customer/waiting/need-help.tsx` | Restyle |
| `components/customer/waiting/notification-status.tsx` | Restyle |
| `components/customer/waiting/smart-wait-message.tsx` | Restyle |
| `components/layout/booking-shell.tsx` | Connection-aware or remove static Live |
| `components/layout/realtime-status-banner.tsx` | Customer-safe copy |
| `lib/waiting/wait-helpers.ts` | Offline label tweak |
| `light/light-experience.test.tsx` | Rename + update |
| `light/light-*.tsx` | Delete after migration |

**No changes:** backend, APIs, routing, queue engine, auth, realtime architecture, `service-mode-config.ts` structure (copy tweak optional P2).

---

## 19. Success criteria checklist (for implementation sign-off)

After implementation, the customer on `/track/[entryId]` must be able to answer within 2 seconds:

- [ ] **Where am I?** — Restaurant + mode-appropriate status headline
- [ ] **How long roughly?** — Ahead count + about X min (from API)
- [ ] **What's ahead of me?** — Mode-correct unit (parties/orders/cars)
- [ ] **What happens next?** — Journey timeline current step visible
- [ ] **Do I need to do anything?** — Clear on ready; "relax" on waiting

Plus:

- [ ] No visual mode switch vs landing/join/completed
- [ ] No technical realtime language
- [ ] No fabricated contact/menu/wait data
- [ ] Screen comfortable for 30+ minutes
- [ ] `npm test`, `typecheck`, `build` pass

---

## 20. Stop condition

This audit is complete. **Await review before UI implementation.**

Do not start P1.2 or other phases automatically after implementation.

---

*Related docs: `QUEUEFLOW_CALM_UX_SYSTEM.md`, `QUEUEFLOW_UX_CONTRACT.md`, `PHASE6_PRODUCT_CONSOLIDATION_AUDIT.md`, `PHASE6_PRODUCTION_READINESS.md`, `E2E_TEST_STRATEGY.md`*
