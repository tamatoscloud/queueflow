# QueueFlow E2E Test Strategy

**Phase:** 6  
**Scope:** Customer portal first; Flutter apps later

---

## Current state

Playwright **already exists** in `apps/customer-portal`:

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Chromium, global setup |
| `e2e/global-setup.ts` | Health check, manifest load |
| `e2e/fixtures.ts` | API helpers, Bella Vista manifest, staff login |
| `e2e/customer-journey.spec.ts` | Dine-in, takeaway, drive-in journeys |
| `e2e/README.md` | Setup instructions |

**CI status:** Playwright is **NOT** in `.github/workflows/ci.yml`. Customer portal CI runs typecheck, lint, unit tests, build only.

**Known gap (P0):** E2E tests expect one-click join with mode-specific button text (`track my order`, `join drive queue`). Current UI uses two-step flow: `Continue` → `Join the queue` (`booking-registration.tsx`).

---

## Strategy

### Phase 6 — Customer portal only

Do **not** attempt full Flutter E2E in Phase 6. Flutter integration tests exist per app (`flutter test`); golden tests cover login screens.

### Test pyramid

```
                    ┌─────────────┐
                    │  Playwright │  3 mode journeys (live backend)
                    │  (manual/   │
                    │   nightly)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │  Vitest component tests │  calm-landing, waiting, join
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │  Vitest unit tests      │  schemas, service-mode-config
              └─────────────────────────┘
```

### Playwright principles

1. **Live backend required** — tests call real API via fixtures (`getTracking`, `callNext`, etc.)
2. **Bella Vista seed required** — queue IDs from `docs/demo/bella-vista-manifest.json`
3. **No fake production APIs** — stub only if adding deterministic unit-level tests separate from Playwright
4. **Mode coverage mandatory** — dine-in, takeaway, drive-in each have a journey spec

### Recommended test cases (customer)

| # | Flow | Status |
|---|------|--------|
| 1 | Landing loads, shows restaurant name | Partial |
| 2 | Join dine-in (party size, name, phone) | **Stale** — needs two-step update |
| 3 | Track waiting state | In spec |
| 4 | Staff call next → customer ready | In spec |
| 5 | Complete → completed screen | In spec |
| 6 | Takeaway order # flow | **Stale** |
| 7 | Drive-in vehicle flow | **Stale** |
| 8 | Returning customer banner | Not in Playwright |
| 9 | Queue closed state | Not in Playwright |
| 10 | Offline/reconnect banner | Not in Playwright |

### Fixing stale E2E (P0)

Update `customer-journey.spec.ts` to:

1. Click `Continue` on join form
2. Click `Join the queue` (or mode-specific label once implemented)
3. Use `getByRole('button', { name: /join/i })` rather than hardcoded takeaway/drive strings until mode CTAs land

### CI recommendation (P1 — not Phase 6 P0)

Add optional nightly workflow:

```yaml
# .github/workflows/e2e-nightly.yml
# Requires: backend + seed + customer-portal running
# Or: docker-compose test stack
```

Do **not** block PR CI on Playwright until join flow is stable and a headless backend fixture exists.

### Mocking policy

| Layer | Mock? |
|-------|-------|
| Playwright customer journeys | **No** — real backend |
| Vitest component tests | Mock `fetch` / React Query |
| Vitest schema tests | No network |

### Flutter apps (future)

| App | Tool | Priority |
|-----|------|----------|
| staff_app | `integration_test` + golden | Phase 7 |
| business_app | `integration_test` | Phase 7 |
| admin_panel | widget tests (existing) | Maintain |
| tv_display | widget tests (existing) | Maintain |

---

## Commands

```bash
# Customer portal unit tests
cd apps/customer-portal && npm test

# Playwright (requires backend + seed)
cd apps/customer-portal
npm run demo:reset  # in backend/
npx playwright test

# Update golden (admin login)
cd apps/admin_panel && flutter test --update-goldens
```

---

## Success criteria

- [ ] Playwright spec matches current two-step join UI
- [ ] All 3 service mode journeys pass against seeded Bella Vista
- [ ] Documented in `e2e/README.md`
- [ ] (P1) Nightly CI job or documented manual pre-demo checklist
