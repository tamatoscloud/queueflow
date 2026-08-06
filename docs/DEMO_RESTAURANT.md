# Bella Vista Restaurant — Client Demo Guide

Use this guide to run a **live, multi-device restaurant waiting-list demo** for clients and investors.

## Quick start

### 1. Seed demo data

```bash
cd backend
SEED_DEMO_PASSWORD="your-demo-password" CUSTOMER_PORTAL_URL="http://localhost:3001" npm run db:seed
```

After seeding, open **`docs/demo/bella-vista-manifest.json`** for queue IDs and QR URLs.

### 2. Start services

| Service | Command | URL |
|---------|---------|-----|
| Backend | `npm run dev` | http://localhost:3000 |
| Customer Portal | `npm run dev` | http://localhost:3001 |
| Business App | `flutter run -d chrome -t lib/main_dev.dart` | Chrome |
| TV Display | `flutter run -d chrome -t lib/main_dev.dart` | Chrome |
| Admin Panel | `flutter run -d chrome -t lib/main_dev.dart` | Chrome |

### 3. Log in (staff)

| Role | Email | Password |
|------|-------|----------|
| Restaurant owner | `owner@bellavista.example.com` | Your `SEED_DEMO_PASSWORD` |
| Platform admin | `ops@queueflow.app` | Your `SEED_DEMO_PASSWORD` |

---

## Restaurant profile

| | |
|--|--|
| **Name** | Bella Vista Restaurant |
| **Location** | Downtown |
| **Hours** | 12 PM – 11 PM |
| **Avg dining time** | 45 minutes |
| **Tables** | 2, 4, 6, 8 guests |

### Queues

1. **Today's Waiting List** — main demo queue (QR codes point here)
2. **Reservation Waitlist**
3. **VIP Guests**

### Pre-seeded stats (main queue)

~134 entries including ~20 waiting, ~100 completed today, 5 VIP, cancellations, and active called/holding guests.

---

## Customer flow (no login)

1. Scan QR → opens `http://localhost:3001/q/{queueId}`
2. See restaurant hero, wait stats, **Join Queue**
3. Fill join form (guests, occasion, seating, notifications)
4. Receive token + live tracking page
5. Updates in real time via Socket.IO

### QR placements (all same join URL)

| Placement | Code |
|-----------|------|
| Restaurant Entrance | `BV-ENTRANCE` |
| Reception Desk | `BV-RECEPTION` |
| Window | `BV-WINDOW` |
| Outdoor Banner | `BV-OUTDOOR` |
| Parking Area | `BV-PARKING` |

Print QR codes from **Business App → Restaurant QR Center**.

---

## Presentation script (15 min)

### Act 1 — Customer joins (2 phones)

1. Open customer portal join URL on two phones (or tabs)
2. Join as different guests
3. Show tokens and live position on tracking page

### Act 2 — Staff console (laptop)

1. Log in to business app as `owner@bellavista.example.com`
2. Open **Queue Console** — Kanban board updates live
3. **Call Next** → customer phones show "Your turn"
4. **Complete** → moves to completed column

### Act 3 — TV display (projector/TV)

1. Pair TV display to main queue
2. Show **NOW SERVING** with animated token
3. Call next on console → TV updates instantly

### Act 4 — Simulator (optional)

1. Business app → **Demo Simulator**
2. **+10 Customers** → rush hour effect on all screens
3. **Pause Queue** → customers see closed state

### Act 5 — Super admin

1. Admin panel → Dashboard & Analytics
2. Show platform KPIs, notification stats, tenant list with Bella Vista

---

## Realtime events

All clients subscribe via existing Socket.IO:

- `CustomerJoined` → dashboard, TV, tracker refresh
- `CustomerCalled` → tracker + TV highlight
- `CustomerCompleted` → Kanban + analytics
- `EstimatedWaitChanged` → countdown updates

**No page refresh required.**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cannot reach server (admin/business) | Set `API_BASE_URL=http://localhost:3000/api/v1` in `.env.dev` |
| QR opens wrong URL | Re-seed with `CUSTOMER_PORTAL_URL` set to your LAN IP for phones |
| Queue closed | Use join form (bypasses hours) or open queue in console |
| Empty dashboard | Select Downtown branch in branch switcher |

---

## Production demo

For client presentations on LAN:

```bash
# Use your machine's IP so phones can scan QR
CUSTOMER_PORTAL_URL="http://192.168.x.x:3001" npm run db:seed
```

Update `apps/business_app/.env.dev` and `apps/customer-portal/.env.local` with the same host.
