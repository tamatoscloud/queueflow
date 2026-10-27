# QueueFlow frontend product audit

Date: 2026-08-17  
Scope: repository frontends and their **existing** production API contracts.  
Production backend (do not modify during this work): `https://queueflow-backend-production.up.railway.app` at git SHA `63ce4bc87374c3a03e82aa4e56d168bc1d953ac3`.

This audit is observational. It does not change production infrastructure, Prisma, JWT/RBAC, or API shapes.

---

## 1. Current applications

| App | Path | Stack | Role | Hosted today |
| --- | --- | --- | --- | --- |
| Customer portal | `apps/customer-portal` | Next.js 15, React, TanStack Query, Socket.IO | Primary customer product (QR join + live track) | Yes — Vercel `https://queueflow-six-beta.vercel.app` |
| Business dashboard | `apps/business_app` | Flutter, Riverpod, GoRouter | Owner + manager + staff shell | **No production host** |
| Staff console | `apps/staff_app` | Flutter (Toast-speed ops) | Reception / call-next | **No production host** |
| Platform admin | `apps/admin_panel` | Flutter web | Tenants, health, activity | **No production host** |
| TV / display | `apps/tv_display` | Flutter | Branch display board | **No production host** |
| Marketing website | `apps/marketing_website` | Flutter web | Product marketing | **No production host** |
| Customer native | `apps/customer_app` | Flutter scaffold | Abandoned; not a demo surface | No |

Shared packages: `packages/theme`, `packages/ui`, `packages/widgets`, `packages/network`, `packages/models`, `packages/core`, `packages/services`. Theme currently mixes SaaS indigo `#6366F1` and “calm” hospitality violet `#8B7CF8`.

---

## 2. Current routes

### Customer portal (live)

| Route | Purpose |
| --- | --- |
| `/` | Scan-to-start homepage. Must not link `/q/demo`. |
| `/q/[queueId]` | Public landing. UUID gate (`isQueueUuid`) before API. |
| `/q/[queueId]/join` | Join form |
| `/q/[queueId]/success` | Redirects to `/track/:entryId?welcome=1` |
| `/track/[entryId]` | Live tracking (WAITING / CALLED / ended) |
| `/completed/[entryId]` | Completion |
| `/feedback/[entryId]` | Optional feedback POST |
| `/drive/[branchId]`, `/takeaway/[branchId]` | Mode-specific landings |
| `/offline` | PWA offline |

### Business app

`/login`, `/dashboard`, `/queues`, `/queues/:id`, `/queues/:id/console`, `/queues/:id/settings`, `/branches`, `/customers`, `/reports`, `/staff`, `/restaurant/qr`, `/restaurant/simulator`, `/restaurant/tables`.

### Staff app

Login + live queue list + `/queues/:id` console. **No QR route.**

### Admin

Login, overview, businesses/tenants, users, branches, activity, health, notifications, subscriptions/plans (where API exists), feature flags, settings.

### TV

Display token login + snapshot board.

---

## 3. Current screens

**Customer:** homepage, queue landing, join, confirmation (welcome banner), waiting, called, completed, feedback, closed/paused, invalid UUID, not found, network error, offline.

**Business:** overview, queue list, **live console** (Call next, complete, skip, hold, walk-in), queue settings, branches, customers, reports, staff invite (list “coming soon”), QR center (buried under restaurant demo), table simulator (local fake tables), restaurant simulator (hits live API — demo risk).

**Staff:** operational live queue with large Call next sheet. Faster than owner console. Missing QR, missing some owner admin.

**Admin:** platform KPIs from `/platform` dashboard, tenants CRUD via platform APIs, health, activity. No Socket.IO.

**TV:** currently serving + waiting codes. Depends on snapshot. After SHA `60d5279` is live, unauthenticated snapshot redacts PII (displayCode only). That SHA is **not** on production yet.

**Marketing:** hero, features, how-it-works, pricing, testimonials. Not wired to a live hosted demo.

---

## 4. Current components

Portal: `BookingShell`, `CalmLanding`, `LightWaitingExperience`, `LightReadyExperience`, `BookingRegistration`, error/skeleton, unused leftovers (`join-wizard`, `restaurant-landing`, old waiting-experience, Bella Vista demo helpers).

Flutter: `Calm*` hospitality widgets, `AppButton`/`AppCard` from `queueflow_ui`, `qr_flutter` QR center in business only.

---

## 5. Current API integration

Envelope: `{ success, data, meta?, requestId }`. Base `/api/v1`.

Portal uses only:

- `GET /customer-portal/queues/:queueId`
- `POST /queues/:queueId/join`
- `GET /customer-portal/entries/:entryId/tracking`
- `POST /customer-portal/feedback`

Business/staff use authenticated queue operations (`call-next`, `complete`, `skip`, `hold`, `snapshot`, walk-in), branches, queues, businesses, restaurant QR **codes** (JSON `targetUrl`, not image bytes).

See `docs/FRONTEND_API_CONTRACT.md`.

---

## 6. Current authentication

- Staff/owner/admin: `POST /auth/login` → JWT access + refresh; Axios/Dio interceptors; secure storage on Flutter.
- Customer: **no account**. Join returns `entryId` + optional `trackingToken`. Token kept in `sessionStorage` (`queueflow.session`), never in the URL.
- `@Public()` portal routes. Invalid `Authorization: Bearer` on public URLs returns 401 after SHA `60d5279` (git only — not live).

---

## 7. Current RBAC assumptions

Backend permissions: manage / operate / reports + platform admin. Queue list/get: any of those; open/pause/resume/close: manage|operate; create/update/delete: manage.

Flutter UI mostly keys off role **name** (`OWNER` / `MANAGER` vs others), not JWT `permissions`. Staff console is operate-speed; owners still land in a restaurant-flavored shell.

**API GAP for UI:** no GET staff list, no `/me` permissions endpoint, no GET roles catalog. Staff list screen is “coming soon” for a reason.

---

## 8. Current realtime architecture

Socket.IO path `/realtime`. Envelope `{ event, occurredAt, businessId, queueId, payload }`.

Subscriptions:

| Channel | Who | Auth |
| --- | --- | --- |
| `subscribe:entry` | Customer tracking | `trackingToken` |
| `subscribe:queue` / `subscribe:queue-detail` | Staff/owner | JWT |
| `subscribe:queue-display` | TV | display token |
| `subscribe:business-queues` | Dashboard | JWT |

Events: `QueueUpdated`, `CustomerJoined`, `CustomerCalled`, `CustomerHeld`, `CustomerSkipped`, `CustomerCompleted`, `QueuePaused/Resumed/Closed`, `EstimatedWaitChanged`.

Portal: entry subscribe + HTTP poll fallback (~15s). Landing: poll only — **must not** `subscribe:queue` (staff-only).

`CustomerCalled` payload: `{ entryId, displayCode, calledByUserId }` — no phone, no “proceed to counter” field beyond branch name on tracking GET.

---

## 9. Current QR capability

- Backend `GET/POST /restaurant/qr-codes` returns a **code + targetUrl**. Frontend must render pixels.
- Join URL convention: `{CUSTOMER_PORTAL_URL}/q/{queueUuid}`.
- `qr_flutter` in business_app and staff_app; `react-qr-code` in portal (tracking pass, not join poster).
- QR center lives under `/restaurant/qr` and is easy to miss. Staff app has **no QR UI**.
- No first-class “this queue’s join QR” on Live Queue.

Demo IDs in `docs/demo/bella-vista-manifest.json` are **local seed**, not production.

---

## 10. Current customer journey

Scan QR → `/q/{uuid}` → see business/branch/wait → join name/phone/party/notification → receive `displayCode` → `/track/{entryId}` → Socket.IO + poll → CALLED → COMPLETED → optional feedback.

Recovery: sessionStorage + tracking GET. Refresh keeps `entryId` in the URL. Invalid UUID never calls the API.

Gaps: three visual languages; Bella Vista Unsplash/menu copy can appear when business name matches; called state is easy to miss on a bright ivory screen; hero metric is wait minutes, not ticket number.

---

## 11. Current business / staff journey

Login → queues → live console → Call next / complete / skip / hold / walk-in. Realtime invalidates snapshot.

Gaps: Call next exists but shares visual weight with “Add customer”; QR not on the console; restaurant simulator can hit live APIs; table floor is local fake data; staff list incomplete.

---

## 12. Current admin journey

Login as `PLATFORM_ADMIN` → overview KPIs + health → tenants → users/activity. No realtime. Plans/subscriptions only if platform API returns data — do not invent billing UI.

---

## 13. Current visual / design system

Competing systems:

1. Portal homepage: indigo SaaS (`globals.css` tokens).
2. Portal booking: ivory + calm violet + Playfair.
3. Flutter: `AppColors.primary` indigo **and** `calmIvory` / `calmViolet`.

Result: prototype + hospitality restaurant, not one product.

---

## 14. Current UX problems

- Live Queue is not presented as the product’s operating system.
- Customer ticket number is secondary to a wait ring.
- Called state is not “impossible to miss”.
- QR for client demo is buried.
- Bella Vista demo content can leak into live landings.
- Staff cannot show a join QR from their console.
- Homepage and booking shell feel like different products.
- “Coming soon” staff list looks unfinished if shown in a client demo.
- Simulator/tables can be mistaken for production features.

---

## 15. Current technical problems

- Flutter apps not hosted — client demo of owner/staff requires local/staging run.
- Production git vs live: portal/security fixes in `60d5279` are not on Railway until trial builder is resolved.
- JWT `permissions` unused in Flutter routing.
- Duplicate staff vs business queue console implementations.
- Dead portal components still compile into the bundle.
- TV will lose names when redacted snapshot ships.

---

## 16. Missing functionality (frontend or API)

| Need | Status |
| --- | --- |
| Queue join QR on Live Queue | Frontend missing (API URL is enough) |
| Staff QR | Frontend missing |
| GET staff members | **API GAP** |
| Customer self-cancel | **API GAP** |
| `/me` | **API GAP** |
| Hosted mailer / SMS / WhatsApp in prod | **Config GAP** (not a UI fake) |
| Billing / invoices | **API GAP** — exclude or Coming soon |
| Advanced multi-branch analytics | Partial reports only — do not fake |
| Working hours REST | Prisma exists; join may return `OUTSIDE_OPERATING_HOURS`; no settings UI API |

---

## 17. API limitations

Documented in `docs/FRONTEND_API_CONTRACT.md`. Frontend must not invent fields. `CreateQueueDto` has no `serviceMode` in some paths — restaurant config holds modes. Public snapshot PII redaction is git-ahead of production.

---

## 18. Mobile issues

Portal is the mobile product but ivory/booking max-width and restaurant copy fight a generic SaaS ticket experience. Tap targets on join are OK. Called state needs stronger contrast outdoors. PWA theme color still emerald vs indigo.

Flutter staff console is tablet-first; QR missing on phone.

---

## 19. Desktop issues

Owner console is a narrow mobile-style column on desktop (wasted space; Call next stuck to bottom — good — but CURRENT vs NEXT hierarchy is card-stack not ops dashboard). Admin is usable on laptop. Marketing is not linked from portal.

---

## 20. Accessibility issues

Hardcoded `#17151a` on `#faf8f5` is OK contrast; violet-on-ivory buttons need checking. Called state not `aria-live="assertive"` everywhere. Focus rings inconsistent. Reduced motion not applied to hourglass ring. Status changes should announce ticket + position.

---

## 21. Production-readiness issues

- Core join/track/call/complete **works** on live `63ce4bc`.
- Launch still blocked by: no hosted business/staff/admin/TV, Vercel gitForkProtection vs commit author, Railway trial builder failed to ship `60d5279`, GitHub Actions not executing jobs, no production mailer, SMS/WhatsApp credentials unset.
- Do not seed production. Local seed + `docs/demo/bella-vista-manifest.json` for staging/dev only.

---

## 22. Client-demo risks

1. Opening `/q/demo` or a non-UUID must not hammer the API (already gated — keep).
2. Bella Vista imagery on a real tenant.
3. No QR on the screen the presenter is actually using (Live Queue).
4. Flutter apps only run locally — document exact `flutter run` / web ports.
5. Simulator writing to whatever API the app is pointed at.
6. Claiming WhatsApp/SMS if production mock is disabled and providers are unconfigured.
7. Showing staff directory as if it worked.
8. Fake table map.

**Demo strategy:** use local/staging seed. If a production tenant is ever required, create an isolated named demo tenant via APIs and delete it after — never silent seed.
