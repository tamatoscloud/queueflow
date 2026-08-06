# Sprint 13 — Restaurant Operating Platform

QueueFlow evolves from a generic queue system into a **restaurant operating platform** with three service modes. This sprint builds on the existing Queue Engine, Socket.IO realtime, notification platform, and auth/RBAC — **without rewriting core algorithms**.

## Service Modes

| Mode | Customer experience | Staff focus | Queue semantics |
|------|---------------------|-------------|-----------------|
| **Dine In** | Join waitlist, party size, menu while waiting, live position | Call next, seat party, transfer table | Standard FIFO + party metadata |
| **Takeaway** | Receipt QR → phone link → kitchen progress (no position) | Kitchen queue, ready, collected | `serviceMode=TAKEAWAY` + `KitchenOrder` |
| **Drive In** | Waiter QR or entrance queue, vehicle link | Assigned cars, deliver to car | `serviceMode=DRIVE_IN` + waiter assignment |

A business enables one or more modes via `BusinessSettings.enabledModes`.

## Schema (migration `20260729180000_restaurant_service_modes`)

| Addition | Purpose |
|----------|---------|
| `Business.businessType` | RESTAURANT, CAFE, FOOD_COURT, CLOUD_KITCHEN, GENERIC |
| `BusinessSettings.enabledModes` | `ServiceMode[]` — DINE_IN, TAKEAWAY, DRIVE_IN |
| `Queue.serviceMode` | Which mode this queue serves |
| `QueueEntry.metadata` | Mode-specific JSON (table, vehicle, order #) — **no engine change** |
| `QRCode.purpose` | ENTRANCE, TAKEAWAY_RECEIPT, WAITER_PERSONAL, etc. |
| `RestaurantTable` | Floor plan, capacity, occupancy, merge |
| `WaiterProfile` | Shift status, current table/vehicle |
| `KitchenOrder` | Takeaway/drive-in kitchen stages |

## Backend API (`/api/v1/restaurant/*`)

| Endpoint | Description |
|----------|-------------|
| `GET/PATCH /restaurant/config` | Business type + enabled modes |
| `GET /restaurant/analytics` | Mode-grouped daily stats |
| `GET/POST/PATCH /restaurant/qr-codes` | QR management |
| `GET /restaurant/qr/resolve/:code` | Public QR resolve + scan tracking |
| `GET/POST/PATCH /restaurant/tables` | Table floor CRUD |
| `POST /restaurant/tables/:id/assign` | Seat party (metadata, no engine change) |
| `GET/POST/PATCH /restaurant/waiters` | Waiter profiles + status |
| `GET /restaurant/kitchen` | Kitchen board (incoming → collected) |
| `POST/PATCH /restaurant/kitchen/orders` | Kitchen order lifecycle |

Customer portal landing now returns `queue.serviceMode` and `business.enabledModes`.

## Frontend adaptation

### Customer Portal
- `ModeLanding` dispatches to Dine-In / Takeaway / Drive-In landing components
- Join → unified live tracking (Sprint 12)
- Mode-specific copy and CTAs

### Business App (Owner)
- `RestaurantConfig` provider loads enabled modes
- Dashboard analytics via `/restaurant/analytics`
- QR Center → migrate to backend QR API (Phase 2)
- Table Floor → backend `RestaurantTable` (Phase 2)

### Staff App
- Today screen adapts primary actions by enabled mode (Phase 2)
- Kitchen board for takeaway (Phase 2)

### TV Display
- Template per mode: Now Serving / Ready Orders / Vehicle Queue (Phase 2)

### Admin Panel
- Tenant detail: business type + enabled modes (Phase 2)

## Queue Engine boundary

**Unchanged:** join, call-next, hold, skip, complete, token issuance, ordering policies.

**Extended at application layer only:**
- `QueueEntry.metadata` for seated/table/vehicle/order fields
- `KitchenOrder` for takeaway pipeline (parallel to queue entry)
- Table assignment updates metadata + table status — does not add new entry statuses

## Realtime

Existing events (`CustomerJoined`, `CustomerCalled`, `EstimatedWaitChanged`, etc.) continue to drive all apps. Kitchen stage changes should emit `QueueUpdated` or a future `KitchenOrderUpdated` domain event (Phase 2).

## Rollout phases

| Phase | Status | Scope |
|-------|--------|-------|
| **13A — Foundation** | ✅ This sprint | Schema, restaurant module API, mode landings, config provider |
| **13B — Operations** | Next | Table floor API wiring, waiter module UI, kitchen dashboard screens |
| **13C — QR Center** | Next | Backend QR CRUD in Flutter, bulk print, branding |
| **13D — Analytics** | Next | Peak hours, waiter/kitchen performance, cross-mode dashboards |
| **13E — Admin + TV** | Next | Super admin mode config, TV templates per mode |

## Local setup

```bash
cd backend
npm run prisma:migrate:dev   # applies restaurant_service_modes migration
npm run dev
```

Enable all modes for Bella Vista (auto-backfilled in migration):

```sql
UPDATE business_settings SET enabled_modes = ARRAY['DINE_IN','TAKEAWAY','DRIVE_IN']::service_mode[]
WHERE business_id = (SELECT id FROM businesses WHERE slug = 'bella-vista');
```

Assign queue modes:

```sql
UPDATE queues SET service_mode = 'TAKEAWAY' WHERE name ILIKE '%takeaway%';
UPDATE queues SET service_mode = 'DRIVE_IN' WHERE name ILIKE '%drive%';
```
