# Wave 1D-C — Staff Realtime Verification Audit

**Date:** 2026-08-12
**Scope:** Verify staff/business Flutter clients work with Wave 1B hardened Socket.IO authorization.
**Backend:** No authorization changes in this wave.

---

## Clients Audited

| Client | Path | Platform | Realtime? |
|--------|------|----------|-----------|
| **staff_app** | `apps/staff_app` | Flutter (mobile/web/desktop) | Yes |
| **business_app** | `apps/business_app` | Flutter (mobile/web/desktop) | Yes |
| admin_panel | `apps/admin_panel` | Flutter | No (health label only) |
| customer_portal | `apps/customer-portal` | Next.js | Wave 1D-A (out of scope) |
| tv_display | `apps/tv_display` | Flutter web | Wave 1D-B (out of scope) |

Both staff clients share identical realtime architecture (`realtime_client.dart`, `realtime_sync.dart`).

---

## Subscription Matrix

| Socket event | Client(s) | Screen / binding | Auth mechanism | Backend authorization | Compatible |
|--------------|-----------|------------------|----------------|----------------------|------------|
| `subscribe:business-queues` | staff_app, business_app | Today, Dashboard, Queues, Staff Home | `handshake.auth.token` + `{ businessId }` | `validateStaffSession` + `assertBusinessAccess(businessId)` | **Yes** (after 1D-C ack gating) |
| `subscribe:business-dashboard` | business_app only | Dashboard | Same | Same | **Yes** |
| `subscribe:queue-detail` | staff_app, business_app | Queue Console | `handshake.auth.token` + `{ queueId }` | `authorizeQueueSubscription(queueId)` — tenant + permission from DB | **Yes** |
| `subscribe:queue` | — | Not used by Flutter clients | Staff JWT | `authorizeQueueSubscription` | N/A (correctly unused) |
| `subscribe:queue-display` | tv_display only | Display board | `displayToken` JWT | Wave 1D-B | Out of scope |
| `subscribe:entry` | customer_portal | Track page | `trackingToken` JWT | Wave 1D-A | Out of scope |

---

## Handshake JWT

| Check | Finding |
|-------|---------|
| Preferred path `handshake.auth.token` | **Used** — `OptionBuilder().setAuth({'token': token})` |
| Query-string JWT | **Not used** in staff/business clients |
| Token source | `AuthTokenStorage.getAccessToken()` — same REST access JWT |
| Missing JWT at handshake | Backend allows anonymous connect (`isStaff: false`); staff subscriptions fail at ack |
| Invalid/expired JWT at handshake | Backend `authenticateHandshake` throws → socket disconnected |
| Revoked session | Backend `validateSession` fails on subscribe (and handshake if token still verifies but session revoked) |

Backend reference: `backend/src/infrastructure/realtime/services/socket-auth.service.ts`

---

## Per-File Findings (Pre–Wave 1D-C Fixes)

### `apps/staff_app/lib/core/realtime/realtime_client.dart`
### `apps/business_app/lib/core/realtime/realtime_client.dart`

| Aspect | Before 1D-C | After 1D-C |
|--------|-------------|------------|
| Subscription emit | Fire-and-forget `.emit()` | `emitWithAckAsync` + `{ ok }` check |
| Ack handling | None | `isStaffSubscribeAckOk` |
| Polling gate | Stopped on `RealtimeStatus.connected` | Stopped on `subscriptionAuthorized == true` |
| `subscribe:queue-detail` payload | `{ queueId, businessId }` | `{ queueId }` only — backend ignores client businessId |
| Logout | Provider dispose only | `authController` listener calls `disconnect()` |
| Token refresh | Not wired to socket | `reconnectWithFreshToken()` uses existing `tryRefreshToken()` |

### `apps/staff_app/lib/core/realtime/realtime_sync.dart`
### `apps/business_app/lib/core/realtime/realtime_sync.dart`

| Aspect | Before | After |
|--------|--------|-------|
| Poll on connect | Stopped immediately when socket connected | Polling until ack `ok: true` |
| Reconnect | Re-subscribe via `registerOnConnected` | Same + ack-aware authorization stream |

---

## Screen Bindings

### staff_app

| Screen | Provider | Subscription |
|--------|----------|--------------|
| Today | `todayRealtimeProvider` | `subscribeBusinessQueues(businessId)` |
| Queue Console | `queueConsoleRealtimeBindingProvider` | `subscribeQueueDetail(queueId)` |

### business_app

| Screen | Provider | Subscription |
|--------|----------|--------------|
| Dashboard | `dashboardRealtimeBindingProvider` | `subscribeBusinessDashboard` + `subscribeBusinessQueues` |
| Queues | `queuesRealtimeProvider` | `subscribeBusinessQueues` |
| Staff Home | `staffHomeRealtimeProvider` | `subscribeBusinessQueues` |
| Queue Console | `queueConsoleRealtimeBindingProvider` | `subscribeQueueDetail` |

`businessId` in bindings comes from `currentUserProvider.session.user.businessId` — used only as subscription target; backend validates against JWT identity.

---

## Permission Matrix (Backend-Authoritative)

| Scenario | Expected backend behavior | Client response (1D-C) |
|----------|---------------------------|------------------------|
| Valid tenant + QUEUE_OPERATE / QUEUE_MANAGE / REPORTS_VIEW | ack `{ ok: true }` | Stop polling, live updates |
| Missing staff JWT at subscribe | ack `{ ok: false }` | Polling continues |
| Invalid/expired JWT at handshake | Connection rejected | Polling continues |
| Revoked session | ack `{ ok: false }` or handshake fail | Polling continues |
| Business A user → Business B `businessId` | `Business access denied` | ack false, polling continues |
| Business A user → Business A queue | Success | ack true |
| Insufficient queue permission | `Insufficient queue permissions` | ack false |
| Platform admin cross-tenant | Allowed where backend permits | ack true |

Client does **not** duplicate authorization logic — only reacts to ack.

---

## Polling Fallback

```
Initial mount → polling START
Socket connecting → polling ACTIVE
Socket connected → polling STILL ACTIVE (until ack)
ack { ok: true } → polling STOP
ack { ok: false } → polling ACTIVE
Disconnect / reconnecting → polling ACTIVE
Logout → disconnect + dispose clears timers
```

HTTP refresh uses existing Riverpod `invalidate()` → REST refetch (same as before).

---

## Security Regression Search

| Pattern | staff/business | customer_portal | tv_display | backend |
|---------|----------------|-----------------|------------|---------|
| `query.token` | None | None | None | Fallback read only (not used by clients) |
| JWT in URL | None | None | None | N/A |
| `console.log` + token | None | Guarded in 1D-A tests | Guarded in 1D-B tests | Server logs socket id only |
| Client trusts businessId for auth | Removed from queue-detail payload | N/A | N/A | Validates from JWT + DB |

---

## Changes Required (Implemented in 1D-C)

1. **Ack-based subscription authorization** — align with Wave 1D-A/TV patterns
2. **Polling gated on ack**, not socket connect
3. **Remove client-supplied businessId** from `subscribe:queue-detail` payload
4. **Logout disconnect** via auth state listener
5. **Wire existing token refresh** to `reconnectWithFreshToken()` helper

## Remaining Risks

1. **Auto-reconnect with stale JWT:** Socket.IO auto-reconnect reuses initial `setAuth` payload; mid-session expiry may require explicit `reconnectWithFreshToken()` (REST interceptor refreshes tokens independently).
2. **Public pairing TV displays** without staff credential remain polling-only (by design, Wave 1D-B).
3. **staff_app** does not call `subscribe:business-dashboard` (no dashboard screen); method exists for parity with business_app.

---

## Wave 1D-C Verdict

Staff/business realtime clients are **compatible** with Wave 1B authorization after ack gating and polling fixes. No backend changes required.
