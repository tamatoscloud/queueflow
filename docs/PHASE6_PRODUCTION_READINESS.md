# Phase 6 — Production Readiness

**Date:** August 2026  
**Scoring:** GREEN = demo-ready for role | YELLOW = usable with known gaps | RED = not demo-ready

---

## Summary scorecard

| Application | UX | A11y | Mobile | Realtime | Errors | Service modes | Demo safety | Tests | Build | **Overall** |
|-------------|-----|------|--------|----------|--------|---------------|-------------|-------|-------|-------------|
| **Customer portal** | YELLOW | GREEN | GREEN | GREEN | GREEN | GREEN | YELLOW | YELLOW | GREEN | **YELLOW** |
| **Staff app** | GREEN | YELLOW | GREEN | YELLOW | GREEN | GREEN | GREEN | YELLOW | GREEN | **GREEN** |
| **Owner app** | GREEN | YELLOW | GREEN | YELLOW | YELLOW | YELLOW | GREEN | YELLOW | GREEN | **YELLOW** |
| **Admin panel** | YELLOW | GREEN | GREEN | N/A | GREEN | N/A | GREEN | GREEN | GREEN | **YELLOW** |
| **TV display** | RED | YELLOW | N/A | GREEN | YELLOW | GREEN | GREEN | GREEN | GREEN | **YELLOW** |
| **Marketing** | GREEN | GREEN | GREEN | N/A | N/A | N/A | YELLOW | YELLOW | GREEN | **YELLOW** |

---

## Customer portal

### GREEN
- Active journey uses calm/light components
- Service-mode copy from `service-mode-config.ts`
- Friendly error messages (`friendly-messages.ts`, `CalmError`)
- Realtime hybrid socket + polling
- Unit tests passing (31/31)
- Build passes

### YELLOW
- **Demo safety:** Menu browse card shown for all restaurants on landing (P0)
- **E2E:** Playwright exists but stale vs two-step join; not in CI
- Track page uses Light experience, not fully unified calm
- Root homepage still legacy

### RED
- None blocking core customer join/track/ready flow

---

## Staff app

### GREEN
- Today + Queue Console calm redesign complete
- Call Next sheet with mode-aware copy
- Friendly errors via `apiExceptionMessage` + `StaffLoadErrorState`
- Service mode helpers with correct terminology

### YELLOW
- **Skip/no-show** no confirmation (P0)
- Dual realtime indicators (shell chip + calm indicator)
- Today uses spinner not skeleton
- Secondary screens (customers, notifications) legacy
- Golden test fails offline (google_fonts) — known

### RED
- None

---

## Owner app (business_app)

### GREEN
- Dashboard, queues, console, customers, alerts, settings calm
- Queue console vertical sections with sticky Call Next
- Developer tools hidden in Settings → Advanced
- Build + analyze pass

### YELLOW
- **Branches screen** exposes raw `$e` (P0)
- **CalmLiveIndicator** misused for queue open/paused (P0)
- **StaffHomeScreen** legacy route still exists (P0)
- **service_mode_helpers** in demo folder (P0)
- Skip without confirmation (P0)
- Close queue without confirmation
- Terminology drift vs staff (parties/people, Skip/No show)
- Auth/branches legacy UI

### RED
- None for primary owner demo path (dashboard → queues → console)

---

## Admin panel

### GREEN
- Primary surfaces calm (overview, businesses, alerts, health, settings)
- Login calm + golden updated
- All tests pass (10/10)
- Build passes
- Human error messages on calm screens

### YELLOW
- Branches, Users, Subscriptions, Audit still legacy
- Static health dot in top bar
- Activity duplicates audit API

### RED
- None for primary admin demo path

---

## TV display

### GREEN
- Realtime socket + polling fallback
- Large typography with fontScale
- Service mode sections
- Widget tests pass
- Build passes

### YELLOW
- Connection banner slightly technical
- No calm visual redesign (Phase 6 target not started)
- Voice announcement stubbed

### RED
- Visual system not aligned with ecosystem (dark legacy)

---

## Marketing website

### GREEN
- CTAs wired (mailto)
- Build passes
- FAQ mostly accurate (offline staff, PWA)

### YELLOW
- Bella Vista in testimonial
- No calm editorial redesign
- Claims "push notifications" without product support

### RED
- _(none after Phase 6 P0 — pricing aligned to backend seed: Free / $29 / $99)_

---

## Cross-cutting

| Area | Status | Notes |
|------|--------|-------|
| Authentication | GREEN | JWT + refresh across apps |
| Navigation | GREEN | business_app staff route redirects to Queues; use dedicated `staff_app` for front desk |
| API honesty | GREEN | No fabricated dashboard metrics |
| Test coverage | YELLOW | Customer E2E stale; Flutter goldens partial |
| Build health | GREEN | All apps build |
| Accessibility | YELLOW | Touch targets on some chips |
| Demo runbook | GREEN | `docs/DEMO_RUNBOOK.md` exists |

---

## Pre-demo checklist (minimum)

- [ ] Backend seeded (`npm run demo:reset` in backend)
- [ ] All services running (see DEMO_RUNBOOK)
- [ ] Customer portal: verify landing does not promise menu for non-demo ✅ (P0 fixed)
- [ ] Staff app: use dedicated `staff_app`, not business_app staff route
- [ ] Owner: dashboard → queue console → call next
- [ ] Marketing pricing page safe to show in demos ✅ (P0 fixed)
- [ ] Do not show admin Branches/Users unless legacy UI acceptable

---

## Path to all-GREEN

1. Complete P0 fixes (Phase 6 implementation pass)
2. P1: TV calm, admin secondary, customer E2E CI, marketing truth pass
3. P2: Legacy screen migration, token consolidation, dead code removal
