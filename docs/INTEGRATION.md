# QueueFlow — End-to-End Integration Report

**Date:** 2026-07-22  
**Scope:** Backend ↔ Business App ↔ Customer Portal ↔ Socket.IO  
**Goal:** Stabilize integration (no new features)

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Backend REST connectivity | ✅ Fixed | Dev CORS allows all localhost origins |
| Flutter Web CORS | ✅ Fixed | No more XMLHttpRequest blocked by missing origin |
| Platform API URLs | ✅ Fixed | Android emulator auto-maps to `10.0.2.2` |
| Auth (login / refresh / logout) | ✅ Verified | Token refresh interceptor + session restore |
| Socket.IO staff + customer | ✅ Verified | Reconnect + polling fallback on both clients |
| E2E workflow | ⚠️ Manual | Requires running backend + both apps locally |
| Automated E2E | ⚠️ Partial | Unit/integration tests pass; full browser E2E not automated |

---

## Fixed Issues

### 1. CORS blocked Flutter Web API calls

**Symptom:** `DioException [connection error]` / XMLHttpRequest onError when running Business App on Chrome.

**Root cause:** Backend CORS only allowed `http://localhost:3001` by default. Flutter Web uses random ports (e.g. `:51234`).

**Fix:** `backend/src/common/http/cors.util.ts` — in development, any `http://localhost:*` or `http://127.0.0.1:*` origin is permitted for REST and Socket.IO.

### 2. Android emulator cannot reach `localhost`

**Symptom:** Connection errors on Android emulator only.

**Fix:** `apps/business_app/lib/core/config/platform_url_resolver.dart` rewrites `localhost` → `10.0.2.2` at bootstrap.

### 3. Riverpod `ref` used after dispose (dashboard)

**Symptom:** `Bad state: Cannot use "ref" after the widget was disposed` on web.

**Fix:** Moved realtime setup from `initState` to `dashboardRealtimeBindingProvider` using `bindRealtimeRefresh`.

### 4. No polling fallback in Business App

**Symptom:** Queue console / dashboard stale when socket disconnects.

**Fix:** `realtime_sync.dart` — HTTP poll every 10–15s while socket is disconnected/reconnecting (matches customer portal pattern).

### 5. Opaque login errors

**Fix:** `apiExceptionMessage()` maps `ApiException` to user-readable strings. Login screen shows backend connectivity probe (`GET /api/v1/health`) with retry.

### 6. Login redirect to `/`

**Fix:** Redirects to `/dashboard` after successful login.

---

## Platform Connectivity Matrix

| Platform | API URL | Socket URL | CORS | Status |
|----------|---------|------------|------|--------|
| Windows desktop | `localhost:3000` | `localhost:3000/realtime` | N/A | ✅ |
| Chrome (web) | `localhost:3000` | same | Dev localhost wildcard | ✅ |
| Android emulator | `10.0.2.2:3000` | same | N/A | ✅ (auto rewrite) |
| Android physical device | Set LAN IP in `.env` | same | N/A | ⚠️ Manual config |
| iOS simulator | `localhost:3000` | same | N/A | ✅ |

---

## End-to-End Workflow Validation

### Prerequisites

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Customer Portal
cd apps/customer-portal && npm run dev   # :3001

# Terminal 3 — Business App
cd apps/business_app
flutter run -d chrome -t lib/main_dev.dart
# or: flutter run -d windows -t lib/main_dev.dart
```

### Flow checklist

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Staff | Login `owner@cafe-aroma.example.com` / `Password123!` | Dashboard loads, connection banner green |
| 2 | Staff | Open Queues → select queue → Console | Waiting list loads, Live chip shows |
| 3 | Customer | Scan QR / open `http://localhost:3001/q/{queueId}` | Landing page loads |
| 4 | Customer | Join queue (name, phone, guests) | Redirect to tracking page |
| 5 | Staff | Console shows new waiting entry | Real-time or ≤15s poll |
| 6 | Staff | Call next | Customer tracker updates (socket + poll) |
| 7 | Staff | Complete service | Entry removed from waiting/called |
| 8 | Customer | Submit feedback | Feedback saved |

**Automated:** Backend queue API integration tests (`queue-apis.integration.test.ts`) cover engine operations. Customer portal realtime unit tests cover polling fallback.

**Manual:** Full cross-client E2E requires all three processes running (documented above).

---

## Authentication

| Flow | Implementation | Verified |
|------|----------------|----------|
| Login | `POST /auth/login` via public Dio | ✅ |
| Session restore | Secure storage + `authController.bootstrap()` | ✅ |
| Token refresh | `TokenRefreshInterceptor` on 401 | ✅ |
| Logout | `POST /auth/logout` + clear storage | ✅ |
| Forgot password | `POST /auth/password/forgot` | ✅ |

---

## Real-Time

| Client | Transport | Reconnect | Fallback poll |
|--------|-----------|-----------|---------------|
| Customer Portal | Socket.IO `/realtime` | `reconnectionAttempts: Infinity` | 15s tracking / 30s landing |
| Business App | Socket.IO + JWT auth | `enableReconnection()` | 10s console / 15s dashboard |

Wire events fan-out per `docs/REALTIME.md`. Both clients refresh REST data on socket events (no duplicated business logic).

---

## Performance Improvements

- Dashboard converted from `ConsumerStatefulWidget` → `ConsumerWidget` (no unnecessary state)
- Realtime bindings use `Provider.autoDispose` (clean teardown)
- Targeted `ref.invalidate()` on socket events (no full-app rebuild)
- `onConnectError` handler updates realtime status chip

---

## Test Results

```bash
# Backend
cd backend && npm test

# Business App
cd apps/business_app && flutter test

# Customer Portal
cd apps/customer-portal && npm test
```

| Suite | Result |
|-------|--------|
| `backend` cors.util.test.ts | Pass |
| `backend` queue-apis.integration.test.ts | Pass |
| `business_app` unit + widget + golden | Pass |
| `customer_portal` vitest | Pass |

---

## Remaining Blockers / Known Issues

1. **Physical Android device** — Must set `API_BASE_URL` / `WS_BASE_URL` to host machine LAN IP (documented in `.env.dev`).
2. **Full automated E2E** — No Playwright/Patrol suite yet; workflow validated via manual checklist + API integration tests.
3. **Staff list API** — Backend has invite/disable only; staff screen shows invite UI (product gap, not integration).
4. **Production CORS** — Must set explicit `CORS_ALLOWED_ORIGINS` (localhost wildcard is development-only).

---

## Files Changed (integration stabilization)

```
backend/src/common/http/cors.util.ts          (new)
backend/src/common/http/cors.util.test.ts     (new)
backend/src/main.ts                           (CORS delegate)
backend/src/infrastructure/realtime/gateway/  (socket CORS)
apps/business_app/lib/core/config/platform_url_resolver.dart
apps/business_app/lib/core/network/connection_diagnostics.dart
apps/business_app/lib/core/realtime/realtime_sync.dart
apps/business_app/lib/features/dashboard/     (provider-based realtime)
apps/business_app/lib/features/queue_console/ (provider-based realtime)
apps/business_app/lib/features/auth/login_screen.dart (diagnostics)
```
