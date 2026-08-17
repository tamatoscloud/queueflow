# QueueFlow product architecture

QueueFlow is a multi-tenant queue operating system. The **backend API is the source of truth**. Frontends are views over that contract. This map uses only capabilities that exist today.

## Experiences

```text
Customer (web PWA)
  QR scan → landing → join → ticket → live track → called → completed

Owner / Manager (Flutter)
  Login → Live Queue (primary) → Queues / Branches / Settings
  QR poster for a real queue UUID

Staff (Flutter)
  Login → Live Queue (speed) → Call / Complete / Skip
  Same QR poster on the console (demo + floor)

Platform admin (Flutter web)
  Login → tenants, health, activity
  Create tenant for demos via existing platform APIs

TV display (Flutter)
  Display token → currently serving + waiting codes
```

## Identity and tenancy

- Tenant = Business. Branches belong to a business. Queues belong to a branch.
- Roles: PLATFORM_ADMIN, OWNER, MANAGER, STAFF (names; enforce via backend permissions).
- Customers are not users. They hold an entry + tracking token.

## Queue state machine (do not change)

Queue: `ACTIVE` | `PAUSED` | `CLOSED` | `ARCHIVED`  
Entry: `WAITING` → `CALLED` → `COMPLETED`  
Also: `HOLDING`, `SKIPPED`, `CANCELLED`, `NO_SHOW`

Staff actions already implemented: join (public), walk-in (staff), call-next, complete, skip, hold, resume, recall, cancel, no-show.

## Join identity

URL: `https://<portal>/q/<QUEUE_UUID>`  
Queue UUID is the only join key. Never invent IDs. Restaurant QR codes resolve to a `targetUrl` that should be this same shape.

## Realtime

Socket.IO `/realtime`. Customer: `subscribe:entry` + trackingToken. Staff: `subscribe:queue-detail`. Fallback HTTP poll. Do not replace with polling-only.

## Data for a client demo (safe)

Preferred: local `backend/prisma/seed.ts` / restaurant demo seed + `docs/demo/bella-vista-manifest.json`.  
Staging project is isolated. **Never seed production silently.**

## What this product is not (yet)

Billing, hosted email, reliable SMS/WhatsApp in production, staff directory GET, customer self-cancel, fake table floor as a product feature.

## Application of record per job

| Job | App of record |
| --- | --- |
| Customer ticket | `apps/customer-portal` |
| Operate the line | `apps/staff_app` and Live Queue in `apps/business_app` |
| Configure business | `apps/business_app` |
| Platform | `apps/admin_panel` |
| Lobby board | `apps/tv_display` |
| Marketing story | `apps/marketing_website` |
