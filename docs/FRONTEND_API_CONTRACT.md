# QueueFlow frontend API contract

All paths are relative to `https://<api-host>/api/v1` unless noted.  
Success: `{ success: true, data, meta?, requestId }`.  
Error: `{ success: false, error: { code, message, details? }, requestId }`.

**Rule:** do not invent endpoints or response fields. Missing capability = **API GAP**.

---

## Auth

### Login

| | |
| --- | --- |
| Feature | Owner / staff / admin login |
| Endpoint | `/auth/login` |
| Method | POST |
| Auth | Public |
| Request | `{ email, password }` |
| Response | tokens + user (role, businessId, …) |
| Frontend | Flutter login screens |
| Realtime | none |
| Failure | 401 invalid credentials; generic messages |

Also used: `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/email/verify`, `/auth/email/resend`.  
**Config GAP:** production does not send mail; forgot/invite tokens are created but not emailed.

### API GAP

- `GET /me` — not present. Frontend uses login payload + stored user.
- No FCM device register endpoint used in production path.

---

## Customer portal

### Queue landing

| | |
| --- | --- |
| Feature | QR landing |
| Endpoint | `/customer-portal/queues/:queueId` |
| Method | GET |
| Auth | Public (`ParseUUIDPipe`) |
| Request | UUID path |
| Response | `QueueLanding`: business, branch, queue (`id,name,status,isAcceptingEntries,prefix,serviceMode?`), live (`waitingCount,estimatedWaitMinutes,averageServiceTimeMinutes,isOpen,generatedAt`) |
| Frontend | `/q/[queueId]` |
| Realtime | HTTP poll on landing; **not** `subscribe:queue` |
| Failure | 400 non-UUID (frontend must not call); 404 unknown; 5xx retry |

### Join

| | |
| --- | --- |
| Feature | Join queue |
| Endpoint | `/queues/:queueId/join` |
| Method | POST |
| Auth | Public |
| Request | `{ fullName, phone, partySize, notes?, metadata?, notificationPreference }` (`SMS` \| `WHATSAPP` \| `BOTH`) |
| Response | `{ entryId, customerId, displayCode, tokenNumber, trackingToken?, estimate: { position, customersAhead, estimatedWaitMinutes, averageServiceTimeMinutes } }` |
| Frontend | `/q/[queueId]/join` → sessionStorage → `/track/[entryId]` |
| Realtime | `CustomerJoined` to staff rooms |
| Failure | closed, paused, full, `OUTSIDE_OPERATING_HOURS`, validation |

### Tracking

| | |
| --- | --- |
| Feature | Live ticket |
| Endpoint | `/customer-portal/entries/:entryId/tracking` |
| Method | GET |
| Auth | Public |
| Request | entry UUID |
| Response | `EntryTracking` (status, displayCode, position, customersAhead, wait, business/branch/queue, trackingToken?) |
| Frontend | `/track/[entryId]` |
| Realtime | `subscribe:entry` with trackingToken; poll fallback |
| Failure | 404, network |

### Feedback

| | |
| --- | --- |
| Feature | Post-visit feedback |
| Endpoint | `/customer-portal/feedback` |
| Method | POST |
| Auth | Public |
| Request | `SubmitFeedbackDto` (entry-scoped; see DTO in backend) |
| Frontend | `/feedback/[entryId]` |
| Failure | validation, duplicate |

### API GAP (customer)

- Self-cancel / leave queue
- Named “proceed to counter X” (use `branch.name` only)
- Push via FCM for web customers (browser Notification API is client-only)

---

## Queue operations (staff JWT)

| Feature | Endpoint | Method | Notes |
| --- | --- | --- | --- |
| Snapshot | `GET /queues/:queueId/snapshot` | GET | Unauthenticated = redacted after git `60d5279` (not live). Staff Bearer = full. |
| Metrics | `GET /queues/:queueId/metrics` | GET | |
| Walk-in | `POST /queues/:queueId/walk-in` | POST | Staff |
| Call next | `POST /queues/:queueId/call-next` | POST | Primary action |
| Complete | `POST /queue-entries/:entryId/complete` | POST | |
| Skip / hold / resume / recall / cancel / no-show | matching POST | POST | |
| Move / transfer / priority | POST | POST | Advanced; expose only if UI is ready |
| Estimated wait | `GET /queue-entries/:entryId/estimated-wait` | GET | |

Realtime after mutations: `CustomerCalled`, `CustomerCompleted`, etc. Frontend must update **without refresh**.

Queue CRUD: `/queues` (list/create/get/patch/delete) + open/pause/resume/close — permissions: list any of manage\|operate\|reports; mutations manage\|operate except create/update/delete = manage.

---

## Branches / business

- `GET/POST /branches`, `GET/PATCH/DELETE /branches/:id`
- `GET/POST /businesses`, `GET/PATCH /businesses/:id` (tenant checked)

---

## Restaurant QR (codes, not images)

| | |
| --- | --- |
| Feature | Persist a named QR target |
| Endpoint | `GET/POST /restaurant/qr-codes`, `PATCH /restaurant/qr-codes/:id` |
| Auth | Staff manage |
| Response | includes `targetUrl` **not** PNG bytes |
| Resolve | `GET /restaurant/qr/resolve/:code` public |
| Frontend usage | Optional. **Join demo does not require this** — render `{portal}/q/{queue.id}` with `qr_flutter`. |

---

## Staff invites

`POST /staff/invitations`, accept, resend, disable user, put role, put branches.

**API GAP:** GET staff list / GET roles catalog. UI must not invent a directory.

---

## Notifications

List/stats/settings/templates/retry/logs. Platform admin must pass `businessId`. SMS/WhatsApp credentials are environment **config**, not frontend mocks.

---

## Platform admin

Dashboard KPIs + health, tenants, activity, plans/subscriptions **only as returned**. Do not fabricate analytics.

---

## Realtime events (exact names)

`QueueUpdated` `CustomerJoined` `CustomerCalled` `CustomerHeld` `CustomerSkipped` `CustomerCompleted` `QueuePaused` `QueueResumed` `QueueClosed` `EstimatedWaitChanged`

Subscribe: `subscribe:entry` | `subscribe:queue` | `subscribe:queue-detail` | `subscribe:queue-display` | `subscribe:business-queues`

`CustomerCalled.payload`: `{ entryId, displayCode, calledByUserId }` — no phone.

---

## Health

`GET /health`, `GET /health/live` (unversioned health controller). Production redacts down-detail on live `63ce4bc` vs later git.

---

## Explicit non-goals (do not call)

Fake billing portals, invented report engines, `/q/demo`, forged JWTs, production seed endpoints.
