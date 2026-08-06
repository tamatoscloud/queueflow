# Playwright E2E — Customer Portal

End-to-end tests for the customer join → track → called → completed journey across all three service modes.

## Prerequisites

1. Backend running (`cd backend && npm run dev`)
2. Customer portal running (`cd apps/customer-portal && npm run dev`)
3. Bella Vista demo seeded or reset:
   ```bash
   cd backend
   SEED_DEMO_PASSWORD="your-password" CUSTOMER_PORTAL_URL="http://localhost:3001" npm run demo:reset
   ```
4. Clear active queue entries before a clean run (recommended):
   ```bash
   SEED_DEMO_PASSWORD="your-password" npm run demo:clear
   ```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3001` | Customer portal URL |
| `API_BASE_URL` | `http://localhost:3000/api/v1` | Backend API |
| `DINE_IN_QUEUE_ID` | from manifest | Dine-in queue UUID |
| `TAKEAWAY_QUEUE_ID` | from manifest | Takeaway queue UUID |
| `DRIVE_IN_QUEUE_ID` | from manifest | Drive-in queue UUID |
| `DEMO_STAFF_EMAIL` | `owner@bellavista.example.com` | Staff login for API transitions |
| `DEMO_STAFF_PASSWORD` | — | Staff password (or use `SEED_DEMO_PASSWORD`) |

Queue IDs are read automatically from `docs/demo/bella-vista-manifest.json` when not set.

## Run tests

**You are already in `apps/customer-portal` if you followed setup above.** Do not `cd apps/customer-portal` again from there.

From repo root (PowerShell):

```powershell
# 1. Reset demo data (once, or when manifest is stale)
cd D:\projects\tamatos-app\queueflow\backend
$env:SEED_DEMO_PASSWORD = "your-password"
$env:CUSTOMER_PORTAL_URL = "http://localhost:3001"
npm run demo:reset

# 2. Backend (separate terminal — skip if already running)
cd D:\projects\tamatos-app\queueflow\backend
npm run dev

# 3. Customer portal (separate terminal — skip if port 3001 already in use)
cd D:\projects\tamatos-app\queueflow\apps\customer-portal
npm run dev

# 4. E2E
cd D:\projects\tamatos-app\queueflow\apps\customer-portal
npm run test:e2e:install          # first time only
$env:DEMO_STAFF_PASSWORD = "your-password"
npm run test:e2e:preflight        # checks backend, portal, manifest, login
npm run test:e2e
```

`EADDRINUSE` on port 3001 means the portal is **already running** — that is fine.

Staff API steps (`call-next`, `complete`) use existing authenticated endpoints so UI realtime transitions stay deterministic without automating the Flutter staff app.
