# QueueFlow UX architecture

Designed against the **existing API**, not an imaginary product. Hidden or “coming soon” only when the backend cannot support the screen.

## Customer (mobile-first)

```text
QR Scan
  ↓
Queue Landing     business, branch, queue name, status, wait, people waiting, what happens next
  ↓
Join              name, phone, party size, notification preference (required by join DTO)
  ↓
Confirmation      ticket number, position, wait — then continue to live track
  ↓
Live Tracking     YOUR NUMBER / POSITION / PEOPLE AHEAD / ESTIMATED WAIT + connection
  ↓
Called            unmissable + optional vibration; proceed to branch (name from API)
  ↓
Completed         summary + optional feedback
```

**Landing gates:** invalid UUID (no API), unknown UUID (Queue not found), closed, paused, full, network, offline. Returning visitors with `queueflow.session` resume tracking.

**Do not** show Bella Vista menus, Unsplash heroes, or fake addresses.

## Business owner (desktop / tablet)

```text
Login
 ↓
Live Queue          ← default home after login for operators
 ├── Status (open / paused / closed)
 ├── Current (CALLED)
 ├── Next + CALL NEXT (primary)
 ├── Waiting list
 ├── Queue QR (join URL for this UUID)
 └── Walk-in
 ├── Queues          list + settings
 ├── Branches
 ├── Customers       if API list exists
 ├── Staff           invite only until GET list exists (API GAP)
 ├── Analytics       daily-summary / metrics only — no invented charts
 └── Settings        business profile PATCH
```

Do not ship fake billing. Simulator and fake tables stay out of the primary nav or gated as non-production.

## Staff

Same Live Queue information, larger controls, tablet layout, QR sheet on the console. No branch CRUD unless the role can manage.

## Platform admin

```text
Login
 ↓
Overview            KPIs + health from GET dashboard (no fabricated numbers)
 ├── Businesses / tenants
 ├── Business details
 ├── Users          if list API exists
 ├── Plans          only real plan rows
 └── Settings / health / activity
```

## TV

16:9, large displayCode, currently serving, next few, branch name, live status. No interaction beyond setup.

## Navigation principles

1. Operator’s first click is the live line, not settings.
2. Customer’s first screen answers: where am I, how long, what do I do.
3. One visual language (see design system).
4. Every screen: loading skeleton, empty, error, offline, success, permission, session expired.
5. Realtime is primary; poll is backup; refresh must not drop session.
