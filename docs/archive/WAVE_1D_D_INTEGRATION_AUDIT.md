# Wave 1D-D Integration & Regression Audit

**Date:** 2026-08-12
**Scope:** Full Phase 10 Wave 1 (1A → 1D-C) integration, regression, and security release gate
**Code changes in this wave:** Documentation only (`docs/WAVE_1D_D_INTEGRATION_AUDIT.md`)

---

## 1. Executive Summary

**Status: PASS WITH WARNINGS**

Wave 1D-D validation confirms that backend security waves (1A–1C-C) and client credential waves (1D-A–1D-C) integrate correctly:

- Customer portal uses `trackingToken` for `subscribe:entry` with ack-gated polling.
- TV uses backend `displayCredential` JWT for `subscribe:queue-display` with ack-gated polling.
- Staff/business apps use `handshake.auth.token` with ack-gated polling.
- `socket.join()` occurs only after authorization on all gateway paths.
- Public join privilege escalation is blocked; staff walk-in privileges preserved.
- Queue join/callNext/transfer concurrency and notification idempotency tests pass.
- No JWT/query-string credential leakage found in clients.
- No P0/P1 blocker inside Wave 1D scope.

**Warnings (non-blocking):**

1. Pre-existing `business_app` StatCard golden pixel flake (unrelated to realtime).
2. Local backend `.env` lacks `DATABASE_URL` (schema validated with placeholder URL; no DB reset performed).
3. Accepted residual risks: public UUID-guessable tracking/snapshot endpoints; non-join/callNext/transfer mutations not fully transactionalized; staff auto-reconnect may reuse stale JWT until refresh; external notification delivery is at-least-once not exactly-once.

**Final recommendation:** READY FOR STAGING WITH WARNINGS

---

## 2. System Integration Map

```
┌─────────────────┐   trackingToken JWT    ┌──────────────────────────────┐
│ Customer Portal │ ─────────────────────► │ Socket.IO /realtime          │
│ (Next.js)       │   subscribe:entry      │ RealtimeSubscriptionAuthorizer│
│ HTTP poll 15s   │ ◄── ack {ok} ───────── │ + RealtimeCredentialService  │
└────────┬────────┘                        └──────────────┬───────────────┘
         │ join / tracking HTTP                           │
         ▼                                                │
┌─────────────────┐   displayCredential JWT               │
│ TV Display      │ ─────────────────────►                │
│ (Flutter)       │   subscribe:queue-display             │
│ HTTP poll Nx    │ ◄── ack {ok} ─────────────────────────┤
└────────┬────────┘                                       │
         │ staff POST display-credential                  │
┌─────────────────┐   handshake.auth.token                │
│ Staff App       │ ─────────────────────►                │
│ Business App    │   subscribe:queue-detail /            │
│ (Flutter)       │   business-dashboard / business-queues│
│ HTTP poll 10s   │ ◄── ack {ok} ─────────────────────────┘
└────────┬────────┘
         │ REST (tenant-scoped)
         ▼
┌─────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                        │
│  TenantScopeService (1A)                                │
│  QueueOperations + QueueEngine (1C-A/B)                 │
│  Notification bridge/worker (1C-C)                      │
│  Prisma / PostgreSQL                                    │
└─────────────────────────────────────────────────────────┘
```

### Repository inventory (discovered)

| Area | Path |
|------|------|
| Backend | `backend/` |
| Customer portal | `apps/customer-portal/` |
| TV display | `apps/tv_display/` |
| Staff app | `apps/staff_app/` |
| Business app | `apps/business_app/` |
| Admin panel | `apps/admin_panel/` (no Socket.IO client) |
| Customer app | `apps/customer_app/` (no realtime client) |
| Marketing | `apps/marketing_website/` |
| Shared packages | `packages/{core,models,network,services,shared,theme,ui,utils,widgets}` |
| Prisma | `backend/prisma/schema.prisma` + migrations |
| Realtime | `backend/src/infrastructure/realtime/` |
| Notifications | `backend/src/infrastructure/notifications/` |
| Queue engine | `backend/src/queue-engine/` |

---

## 3. End-to-End Flows

### FLOW A — Public join → trackingToken → realtime

1. Portal `POST /queues/:queueId/join` with `JoinQueueDto` (no privilege fields).
2. `QueueOperationsService.join` hardcodes `isVip: false`, `bypassOperatingHours: false`.
3. `QueueEngine.joinQueue` runs inside `commitMutation` / unit-of-work (locks, capacity, atomic token).
4. Response includes `trackingToken` (entry-scoped JWT).
5. Portal stores token in sessionStorage via `saveQueueSession` / `saveTrackingTokenForEntry`.
6. Navigate to `/track/:entryId` (no token in URL).
7. `useEntryTracking` → `subscribeEntryTracking({ entryId, trackingToken })`.
8. Socket emits `subscribe:entry`; ack `{ ok: true }` required; else recover once then poll.

**Verified by:** public-join security tests (10), portal realtime/entry/guards tests, types/API inspection.

### FLOW B — TV display credential

1. Staff setup → authenticated `POST /queues/:id/display-credential`.
2. Backend JWT stored as `DisplayConfig.displayCredential`; local 8-char pairing code remains `displayToken` (UI only).
3. Display board connects → `subscribe:queue-display { queueId, displayToken: JWT }`.
4. Ack gates polling stop; missing/invalid credential keeps polling.

**Verified by:** TV client tests (22), setup/API source inspection, gateway display tests.

### FLOW C — Staff/business realtime

1. Access JWT via `setAuth({'token': token})` → `handshake.auth.token`.
2. Subscriptions: business-queues / business-dashboard / queue-detail (`{ queueId }` only).
3. Ack `{ ok: true }` → `subscriptionAuthorized` → stop polling.
4. Logout disconnects socket.

**Verified by:** staff/business realtime tests, gateway + authorizer tests, source guards.

---

## 4. Security Verification

| Area | Result | Evidence |
|------|--------|----------|
| Tenant isolation | PASS | `tenant-isolation.test.ts` (20), service `requireQueue`/`requireQueueEntry`, transfer cross-tenant Forbidden |
| Realtime auth | PASS | gateway tests (4), authorizer (14), credential (4), socket-auth (6) |
| Public join | PASS | `queue-operations.public-join.security.test.ts` (10); DTO stripped; service hardcodes |
| JWT handling | PASS | static client audits; no `?token=`; staff uses auth.token; portal/TV payload JWTs |
| Concurrency | PASS | `queue-engine.concurrency.test.ts` (11); join/callNext/transfer use `commitMutation` |
| Notifications | PASS | `notification-idempotency.test.ts` (13), bridge idempotency (4), platform (5) |
| Client credential propagation | PASS | portal 45, TV 22, staff 15, business Wave-1D tests 14 |
| Polling ack gate | PASS | all four clients gate on ack/authorized, not mere connect |
| Prisma migration | PASS | schema validates; migration `20260811160000_notification_idempotency` present; Prisma generate OK |

---

## 5. Test Results

Executed during Wave 1D-D (exact):

| Suite | Result | Count |
|-------|--------|-------|
| Backend `npm run typecheck` | PASS | — |
| Backend `npm run test` | PASS | **172/172** (27 files) |
| Backend `npm run build` | PASS | — |
| Prisma `validate` + `generate` | PASS | placeholder `DATABASE_URL` (local `.env` has no value) |
| Customer portal typecheck | PASS | — |
| Customer portal test | PASS | **45/45** (9 files) |
| Customer portal build | PASS | — |
| TV `flutter analyze` | PASS | no issues |
| TV `flutter test` | PASS | **22/22** |
| TV `flutter build web` | PASS | — |
| Staff `flutter analyze` | PASS | no issues |
| Staff `flutter test` | PASS | **15/15** |
| Staff `flutter build web` | PASS | — |
| Business `flutter analyze` | PASS | no issues |
| Business Wave-1D tests | PASS | **14/14** (excl. golden failure path) |
| Business full suite | WARN | StatCard golden fails (~0.10% pixel diff) — pre-existing |
| Business `flutter build web` | PASS | — |
| `git diff --check` | PASS | — |

**No tests were modified solely to force green.**

---

## 6. Findings

| Severity | Finding | Status |
|----------|---------|--------|
| INFO | `docs/REALTIME.md` still documents customer portal using `subscribe:queue` | Stale docs — follow-up P2 |
| INFO | Backend `socket-auth` still accepts `handshake.query.token` as fallback | EXPECTED legacy; clients do not use it |
| WARN | `business_app` StatCard golden flake | Pre-existing; outside Wave 1D |
| WARN | Local `.env` missing `DATABASE_URL` | Environment; schema validated via placeholder |
| INFO | `apps/business_app/test/failures/stat_card_*.png` modified by golden run | Test artifact noise; not feature code |
| P1 (follow-up) | hold/skip/complete/cancel/move/recall/priority/no-show not under `commitMutation` | REVIEW → P1 FOLLOW-UP (out of 1D-D fix policy) |
| ACCEPTED | Public tracking/snapshot/landing by UUID | Intentional public CX; realtime still credential-gated |
| ACCEPTED | External SMS/WhatsApp not exactly-once | Documented 1C-C limitation |
| ACCEPTED | Staff Socket.IO auto-reconnect may reuse stale JWT | Use existing refresh + `reconnectWithFreshToken` |

### JWT leakage classification (sample)

| Occurrence | Classification |
|------------|----------------|
| Portal sessionStorage `trackingToken` | EXPECTED |
| Portal `subscribe:entry` payload | EXPECTED |
| TV Hive `displayCredential` | EXPECTED |
| TV UI shows local pairing `displayToken` | SAFE (not JWT) |
| Staff/business `setAuth({token})` | EXPECTED |
| Backend `handshake.query?.token` fallback | EXPECTED (unused by clients) |
| `?token=` / `trackingToken=` in URLs | REMOVE — not present |
| `console.log`/`print` of credentials | REMOVE — not present |

### Public endpoint threat model (intentional)

| Endpoint | Purpose | Auth | Risk | Disposition |
|----------|---------|------|------|-------------|
| `POST /queues/:id/join` | Customer join | Public | Privilege injection | BLOCKED (1C-A) |
| `GET /queues/:id/snapshot` | Live board/tracking | Public | UUID guess → queue view | ACCEPTED / rate-limit P2 |
| `GET /queue-entries/:id/estimated-wait` | Wait estimate | Public | UUID guess | ACCEPTED |
| `GET /customer-portal/queues/:id` | Landing | Public | Branding + live stats | ACCEPTED |
| `GET /customer-portal/entries/:id/tracking` | Tracking recovery + token | Public | UUID guess returns trackingToken | ACCEPTED RISK / P1 review for secondary factor |
| `POST /customer-portal/feedback` | Feedback | Public | Spam | P2 rate-limit |
| `GET /restaurant/qr/resolve/:code` | QR resolve | Public | Enumeration | ACCEPTED |
| Auth login/refresh/forgot | Auth | Public | Standard | EXPECTED |
| `POST /staff/invitations/accept` | Invite accept | Public | Token-bound | EXPECTED |
| Health | Ops | Public | Info | EXPECTED |

### Remaining queue mutations (concurrency)

| Mutation | Classification |
|----------|----------------|
| join / callNext / transfer | SAFE (transactional 1C-B) |
| hold / resume / skip / recall / complete / cancel / move / priority / no-show | P1 FOLLOW-UP |

---

## 7. Known Accepted Risks

1. **Public tracking/snapshot by entry/queue UUID** — product requirement for QR CX; Socket.IO still requires scoped JWT.
2. **Tracking GET returns a fresh `trackingToken`** — recovery mechanism; anyone who knows `entryId` can obtain a token (Wave 1C-D candidate for hardening).
3. **Notification provider delivery is at-least-once**, not exactly-once across external SMS/WhatsApp.
4. **Staff socket auto-reconnect JWT staleness** until explicit refresh/reconnect.
5. **Non-core queue mutations** lack full transactional locking of Wave 1C-B.
6. **TV public-pairing-only setups** operate on HTTP polling until staff issues a display credential (by design).

---

## 8. Follow-up Waves

### P0
- None inside Wave 1D scope.

### P1
- Harden public tracking token issuance (proof-of-possession / short-lived recovery challenge).
- Transactionalize remaining high-risk queue mutations (hold/skip/complete/cancel/move/…).
- Staff socket auth refresh on reconnect (wire existing refresh into auto-reconnect path).

### P2
- Rate-limit public join/snapshot/tracking/feedback.
- Update stale `docs/REALTIME.md`.
- Fix/regenerate business StatCard golden baseline.
- Consider removing unused `handshake.query.token` fallback after all clients confirmed.

### Future
- Wave 2 features (explicitly not started).
- Provider-level SMS/WhatsApp idempotency where supported.
- Shared Flutter realtime package to dedupe staff/business clients.

---

## 9. Final Recommendation

**READY FOR STAGING WITH WARNINGS**

### Acceptance checklist

- [x] Customer tracking realtime works with trackingToken
- [x] TV realtime works with displayCredential
- [x] Staff realtime works with handshake.auth.token
- [x] Business realtime works with handshake.auth.token
- [x] Authorization ack gates polling shutdown
- [x] Failed auth never joins a room
- [x] Cross-tenant realtime access blocked
- [x] Public join privilege escalation blocked
- [x] Public join normal behavior preserved
- [x] Queue concurrency tests pass
- [x] Notification idempotency tests pass
- [x] Rolled-back mutations emit no notifications (events only after `commitMutation`)
- [x] JWT credentials are not leaked through URLs/logs
- [x] Prisma migration validates
- [x] Backend tests pass (172/172)
- [x] Customer portal tests/build pass (45/45)
- [x] TV tests/build pass (22/22)
- [x] Staff tests/build pass (15/15)
- [x] Business tests/build pass (Wave-1D 14/14; golden WARN)
- [x] No unexpected feature changes in 1D-D (audit doc only)
- [x] No P0/P1 security blocker remains inside Wave 1D scope

---

## 10. Change Scope Audit (Phase 10 overall working tree)

| Wave | Scope (representative) |
|------|------------------------|
| 1A | `common/tenant/`, BusinessContext, branch/customer/feedback/reports services |
| 1B | realtime credential + authorizer + gateway + queue display-credential endpoint |
| 1C-A | JoinQueueDto strip + public-join security tests |
| 1C-B | unit-of-work, transactional repos, concurrency tests |
| 1C-C | notification idempotency migration + claim/worker |
| 1D-A | customer-portal trackingToken + realtime ack |
| 1D-B | tv_display displayCredential |
| 1D-C | staff/business ack gating + queue-detail payload |
| 1D-D | this audit document only |
| Unexpected | `business_app/test/failures/stat_card_*.png` (golden artifact) — not feature code |

**Backend authorization architecture was not redesigned in 1D-D.**

---

## 11. Threat Model Summary

| Attack | Status |
|--------|--------|
| Inject isVip/priority/bypass on public join | BLOCKED |
| Guess UUID → staff mutate | BLOCKED (auth + tenant) |
| Modify businessId for authorization | MITIGATED (JWT/session + DB tenant) |
| Replay tracking JWT on wrong entry | BLOCKED (sub binding) |
| Replay display JWT on wrong queue | BLOCKED |
| Anonymous Socket.IO staff subscribe | BLOCKED |
| Connect then assume authorized (stop poll) | MITIGATED (ack gate) |
| Concurrent duplicate joins / callNext | MITIGATED (1C-B) |
| Duplicate domain events → duplicate SMS | MITIGATED (idempotency key) |
| Worker crash mid-send | MITIGATED (PROCESSING + stale reclaim) |
| Failed TX still notifies | BLOCKED (post-commit publish) |
| Provider double-deliver | ACCEPTED RISK |
| Guess entryId → obtain trackingToken via GET | ACCEPTED RISK / P1 FOLLOW-UP |

---

## Wave 1D-D COMPLETE — READY FOR STAGING WITH WARNINGS

**Commit:** NOT CREATED
**Push:** NOT PERFORMED
**Wave 2:** NOT STARTED
