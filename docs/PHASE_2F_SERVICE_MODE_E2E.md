# Phase 2F — Service Mode End-to-End Demo

This document describes the cross-app demo flow for **Dine-in**, **Takeaway**, and **Drive-in** using the Bella Vista restaurant seed.

## Prerequisites

- Backend running (`backend/`)
- Customer portal (`apps/customer-portal`, port 3001)
- Staff app (`apps/staff_app`)
- Business owner app (`apps/business_app`)
- TV display (`apps/tv_display`) optional
- Bella Vista demo seeded (`backend/prisma/seed-restaurant-demo.ts`)
- Manifest: `docs/demo/bella-vista-manifest.json`

**Owner login:** `owner@bellavista.example.com` / seed password (`Password123!`)

---

## DEMO 1 — DINE-IN

1. **Scan Dine-in QR** (or open dine-in join URL from manifest)
2. **Restaurant landing** — Bella Vista branding, dine-in copy
3. **Join** — Party of 4, name + phone
4. **Live tracking** — Shows "4 parties ahead" (or current count), estimated wait
5. **Staff** — Today / Queue console shows **Party of 4**, token (e.g. W-024)
6. **Owner** — Dashboard **Service performance** shows Dine-in joined/completed/avg wait
7. **Staff Call Next** — Select dine-in queue, call next
8. **Customer** — **"Your table is ready!"** (not takeaway/drive-in copy)
9. **Complete** → feedback / completed screen

---

## DEMO 2 — TAKEAWAY

1. **Scan Takeaway QR**
2. **Takeaway landing** — Pickup-oriented copy
3. **Enter order #4821** + name/phone → Join
4. **Tracking** shows:
   - **"2 orders ahead"** (NOT "parties ahead")
   - Kitchen/preparation timeline labels
5. **Staff** sees **Order #4821**, takeaway token (e.g. T-008)
6. **Owner** sees Takeaway activity in Service performance
7. **Staff calls next**
8. **Customer** sees **"Your order is ready!"** — collect at counter

---

## DEMO 3 — DRIVE-IN

1. **Scan Drive-in QR**
2. **Drive-in landing**
3. **Enter vehicle:** Black Toyota, plate ABC-123 → Join
4. **Tracking** shows **"2 cars ahead"**, stay-in-vehicle messaging
5. **Staff** sees vehicle + plate on entry card
6. **Owner** sees Drive-in activity
7. **Staff calls next**
8. **Customer** sees **"We're coming to your car!"**

---

## Realtime verification

After each join:

| Step | Customer | Staff | Owner | TV |
|------|----------|-------|-------|-----|
| Join | Tracking updates | Entry appears | Live activity + analytics | Queue board updates |
| Call next | Ready experience | Status CALLED | Metrics update | Now serving |
| Complete | Redirect to completed | Entry removed | Completed count | Updates |

Reconnect: disable network briefly on customer device → should show "Reconnecting" then resume live updates (no polling-only workaround).

---

## Known backend gaps (Phase 2F)

- `CreateQueueDto` does **not** include `serviceMode` — queues are created with DB default; owner UI does not expose a non-functional mode picker
- Branch-level takeaway/drive routes without `?queue=` still require queue ID in query
- POS order validation (`POST /takeaway/link`) not implemented
- Kitchen order ↔ queue entry sync is notes/metadata only

---

## Queue creation & serviceMode

**Status:** Queue CRUD create/update DTOs lack `serviceMode`. Existing queue creation remains functional; mode is set at seed/migration level. Document only — no fake UI control.
