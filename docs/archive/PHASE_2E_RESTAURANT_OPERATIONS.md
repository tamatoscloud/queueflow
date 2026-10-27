# Phase 2E — Restaurant Operating Experience

End-to-end restaurant queue management across **Dine-in**, **Takeaway**, and **Drive-in** service modes using existing QueueFlow infrastructure.

## Service modes

| Mode | Backend support | Customer entry | Staff view |
|------|-----------------|----------------|------------|
| **Dine-in** | Full | `/q/{queueId}` → landing → `/q/{queueId}/join` | Mode summary + queue cards |
| **Takeaway** | Partial (queue join; no order API) | `/takeaway/{branchId}?queue={queueId}` | Pickup-oriented cards |
| **Drive-in** | Partial (notes field; no waiter API) | `/drive/{branchId}?queue={queueId}` | Vehicle-oriented join UX |

`Queue.serviceMode` and `BusinessSettings.enabledModes` are set in Prisma. Customer portal landing reads both via `GET /customer-portal/queues/:id/landing`.

---

## Dine-in flow

### Customer
1. Scan entrance QR → `/q/{queueId}`
2. **Restaurant landing** — live queue, hero, join CTA
3. `/q/{queueId}/join` — party size, name, phone, notifications
4. `/track/{entryId}` — wallet-style waiting, realtime position
5. Staff calls → **"Your table is ready!"**
6. Staff seats → completed → feedback

### Staff
1. **Today** — service mode overview (Dine-in / Takeaway / Drive-in counts)
2. **Call next** — primary dine-in queue
3. Queue console — mode-aware entry cards

### Owner
- Dashboard **Live queue activity** by mode
- **QR Center** — dine-in tab, printable poster

### TV
- Binds to `queueId`; updates via existing Socket.IO `queue.snapshot` events

---

## Takeaway flow

### Intended journey
1. Customer places order at counter/POS (outside QueueFlow)
2. Receipt QR → `/takeaway/{branchId}?queue={takeawayQueueId}`
3. Enter **order number**, name, phone
4. Live kitchen-style tracking on `/track/{entryId}`
5. Staff calls order → customer notified
6. Collected → completed

### Current implementation
- Landing + join UX with order number field (stored in `notes` as `Order #4821`)
- **No** POS/order lookup API — customer must re-enter order number manually
- Staff cards show pickup label; order number not in snapshot API yet

### TAKEAWAY BACKEND REQUIREMENTS

| Capability | Status |
|------------|--------|
| `POST /takeaway/link` — order reference + phone → queue entry | Missing |
| Order reference validation against POS/kitchen | Missing |
| `KitchenOrder` stage sync with queue entry status | Model exists; not wired to customer portal |
| `estimatedPreparationMinutes` on link | Missing |
| Notification events: `order.preparing`, `order.ready` | Partial (generic queue events) |
| `GET /branches/:id/queues?mode=TAKEAWAY` (public) | Missing |

---

## Drive-in flow

### Intended journey
1. Scan entrance or waiter QR
2. Vehicle details + party size + phone
3. Waiter/host association
4. Staff sees vehicle on card, calls customer
5. Order brought to vehicle → completed

### Current implementation
- Landing + join with vehicle description, color, plate (stored in `notes`)
- **No** waiter assignment or kitchen order link in join API
- Staff cards show party size; vehicle text not in snapshot

### DRIVE-IN BACKEND REQUIREMENTS

| Capability | Status |
|------------|--------|
| Join DTO `metadata` (vehicle, plate, waiterId) | Missing |
| `WaiterProfile` QR personal link resolution (public) | Partial (restaurant module) |
| Snapshot includes `notes` or `metadata` for staff | Missing |
| Kitchen order ↔ drive-in entry association | Missing |

---

## QR architecture

| QR purpose | URL pattern | Seed code |
|------------|-------------|-----------|
| Dine-in entrance | `/q/{queueId}` | `BV-ENTRANCE`, etc. |
| Takeaway receipt | `/takeaway/{branchId}?queue={queueId}` | `BV-TAKEAWAY` |
| Drive-in entrance | `/drive/{branchId}?queue={queueId}` | `BV-DRIVE` |

**Owner QR Center** (business app): filters queues by `serviceMode`, generates mode-specific URLs and printable posters.

Demo manifest: `docs/demo/bella-vista-manifest.json` and `apps/customer-portal/public/demo/bella-vista.json` (written on seed).

---

## Realtime flow

```
Customer join → queue.entry.joined
     ↓
Staff snapshot + Today refresh (subscribeBusinessQueues)
Owner dashboard refresh
TV now-serving refresh (subscribeQueue)
     ↓
Staff callNext → queue.entry.called
     ↓
Customer track page → "Your table is ready!"
```

Events are **not mocked** — use Socket.IO with backend running.

---

## Demo restaurant — Bella Vista

| Field | Value |
|-------|-------|
| Business | Bella Vista |
| Branch | Bella Vista Downtown |
| Owner | `owner@bellavista.example.com` |
| Password | `SEED_DEMO_PASSWORD` (default `Password123!`) |
| Modes | Dine-in, Takeaway, Drive-in |

**Seed:** `backend/prisma/seed-restaurant-demo.ts` — run via main `prisma/seed.ts` (do not reset DB while backend holds pool connections).

**Queues (after re-seed):**
- Dine-In Waiting List (prefix `A`) — ~12 waiting
- Takeaway Pickup (prefix `T`) — 7 orders waiting
- Drive-In Lane (prefix `D`) — 3 waiting

---

## Manual demo instructions

### Prerequisites
```bash
# Terminal 1 — API + Socket.IO
cd backend && npm run start:dev

# Terminal 2 — Customer portal
cd apps/customer-portal && npm run dev

# Terminal 3 — Staff (web)
cd apps/staff_app && flutter run -d chrome

# Terminal 4 — Owner
cd apps/business_app && flutter run -d chrome

# Terminal 5 — TV
cd apps/tv_display && flutter run -d chrome
```

### Script
1. Open manifest `docs/demo/bella-vista-manifest.json` for queue IDs
2. **Customer 1:** open dine-in `joinUrl` → join → note display code
3. **Staff:** Today shows +1 waiting; Call next
4. **Customer 1:** sees "Your table is ready!"
5. **Owner:** dashboard waiting count updates
6. **TV:** bind to dine-in queue ID — now serving updates
7. Repeat with Customers 2–3
8. **Takeaway:** open `serviceModes.TAKEAWAY.branchLandingUrl` → link order
9. **Drive-in:** open `serviceModes.DRIVE_IN.branchLandingUrl` → join with vehicle

---

## Implementation report

### COMPLETED
- Bella Vista seed: three service modes, realistic names, mode QR codes, manifest
- Customer portal: `ModeLanding` on `/q/{queueId}`, join on `/q/{queueId}/join`
- Mode-aware join (takeaway order #, drive-in vehicle fields)
- Branch routes `/takeaway/[branchId]`, `/drive/[branchId]`
- Staff Today: service mode overview, mode labels on queue rows
- Staff queue cards: mode-aware layout and actions
- Owner dashboard: live queue activity by mode
- Owner QR Center: mode tabs, posters, copy/share/print
- Documentation (this file)

### PARTIALLY SUPPORTED
- Takeaway order linking (notes-only workaround)
- Drive-in vehicle/waiter association (notes-only)
- QR Center business name (placeholder until session business name wired)
- Insights on owner dashboard (only from real `DailySummary` / waiting counts)

### BACKEND GAPS
- Public branch → queue resolution by mode
- Takeaway order reference API
- Join payload `metadata` for structured drive-in / takeaway data
- Snapshot `notes`/`metadata` for staff cards
- Queue CRUD exposing `serviceMode` in create/update DTOs

### TEST RESULTS
Run after changes:
```bash
cd backend && npm test && npm run typecheck
cd apps/customer-portal && npm test && npm run typecheck && npm run build
cd apps/staff_app && flutter analyze && flutter test && flutter build web
cd apps/business_app && flutter analyze && flutter test && flutter build web
cd apps/tv_display && flutter analyze && flutter test && flutter build web
cd apps/admin_panel && flutter analyze && flutter test && flutter build web
```

### MANUAL DEMO RESULTS
_To be filled after running live stack with seeded Bella Vista._

### NEXT RECOMMENDED SPRINT
1. `POST /customer-portal/takeaway/link` + POS adapter interface
2. Join DTO `metadata` + snapshot enrichment (no queue-engine rule changes)
3. `GET /customer-portal/branches/:id/queues?mode=`
4. Waiter personal QR resolve → auto-associate drive-in entry
5. Kitchen board ↔ takeaway status sync for customer track copy
