# QueueFlow — Product Overview

> This file didn't exist before the database-layer task that added it —
> it captures the product context that task was given, since several
> schema decisions in [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md)
> only make sense with this flow in mind. Treat it as the canonical
> product-flow reference going forward; update it before changing the
> flow, not after.

QueueFlow is a multi-tenant **Digital Queue Management SaaS**. A
`Business` (e.g. a restaurant, clinic, or retail store) manages one or
more `Branch` locations, each running one or more `Queue`s that
customers join and staff operate.

## There is no customer mobile app

Customers never install anything or create an account. They interact
entirely through a **QR-code landing page** opened in their phone's
mobile browser:

```
Business creates a Queue
        │
        ▼
System generates a QR Code
        │
        ▼
Customer scans QR
        │
        ▼
Mobile browser opens the Queue Landing Page
        │
        ▼
Customer enters: Name · Mobile Number · Number of Guests · Optional Notes
        │
        ▼
Customer chooses a notification preference: WhatsApp · SMS · Both
        │
        ▼
Customer joins the queue
        │
        ▼
System generates a queue token
        │
        ▼
Customer is redirected to a live tracking page showing:
  Queue Position · Estimated Wait Time · Live Countdown ·
  Customers Ahead · Queue Status
        │
        ▼
Customer receives WhatsApp/SMS notifications as their position updates
        │
        ▼
Staff calls the next customer
        │
        ▼
Customer receives an "It's your turn" notification
        │
        ▼
Customer is served
        │
        ▼
Feedback is requested
```

This is why the database layer has no `password`/session concept on
`Customer` at all (see `docs/DATABASE_DESIGN.md`), and why
`NotificationPreference` (the customer's WhatsApp/SMS/Both choice) is
modeled separately from `NotificationChannel` (the actual wire channel
used for one message).

## Who the apps in this monorepo actually serve

- **`apps/business_app`** — staff/managers operating queues at a branch (calling, holding, skipping, completing entries). Tablet-optimized.
- **`apps/tv_display`** — Flutter Web TV queue board for branch lobbies (real-time display, no customer login).
- **`apps/admin_panel`** — QueueFlow's own platform team managing every tenant (billing, plan limits, support).
- **`apps/marketing_website`** — public marketing site, not tenant-scoped.
- **`apps/customer_app`** — scaffolded early in this project under an earlier assumption; **the flow above does not require it** (customers only ever use the QR landing page + live tracking page, both plain mobile web). Whether to keep, repurpose, or remove `customer_app` is an open product decision, out of scope for the database-layer task that added this file — flagged here so it isn't lost.

## Multi-tenancy

A `Business` owns its `Branch`es, staff (`User`), `Queue`s, `Customer`s,
reports/analytics, branding, and settings. See
[`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) for how tenant
isolation is enforced at the database level.
