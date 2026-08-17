# QueueFlow — Infrastructure Architecture Diagrams

**Companion to:** `docs/INFRASTRUCTURE_COST_OPTIMIZATION_AUDIT.md`  
**Type:** Documentation only — no code or infrastructure changes.

---

## 1. Current architecture (as implemented / intended)

```mermaid
flowchart TB
  subgraph Clients
    Portal[Customer Portal<br/>Next.js + Socket.IO client]
    Staff[Staff App<br/>Flutter + Socket.IO]
    Business[Business App<br/>Flutter + Socket.IO]
    TV[TV Display<br/>Flutter + Socket.IO]
  end

  subgraph Hosting
    Vercel[Vercel<br/>Portal]
    Railway[Railway / Node host<br/>NestJS process]
    Supabase[(Supabase PostgreSQL)]
    Upstash[(Upstash Redis)]
  end

  Portal --> Vercel
  Vercel -->|HTTPS REST| Railway
  Portal -->|Socket.IO /realtime| Railway
  Staff -->|REST + Socket.IO| Railway
  Business -->|REST + Socket.IO| Railway
  TV -->|REST + Socket.IO| Railway

  Railway -->|Prisma| Supabase
  Railway -->|BullMQ jobs| Upstash
  Railway -->|In-process NotificationWorker| Upstash
  Railway -->|Socket.IO rooms| Portal
  Railway -->|Socket.IO rooms| Staff
  Railway -->|Socket.IO rooms| Business
  Railway -->|Socket.IO rooms| TV
```

**Facts:** Redis is only on the notification path. Queue locks are PostgreSQL. Socket.IO has no Redis adapter today (single Nest instance).

---

## 2. Proposed cheapest safe architecture

**Vercel + Supabase + Railway (no Redis / no BullMQ)**

```mermaid
flowchart TB
  subgraph Clients
    Portal[Customer Portal]
    Staff[Staff App]
    Business[Business App]
    TV[TV Display]
  end

  subgraph Hosting
    Vercel[Vercel<br/>Portal]
    Railway[Railway<br/>NestJS API + Socket.IO<br/>+ PG job worker]
    Supabase[(Supabase PostgreSQL<br/>queues + notifications<br/>+ notification_jobs)]
  end

  Portal --> Vercel
  Vercel -->|REST| Railway
  Portal -->|Socket.IO| Railway
  Staff -->|REST + Socket.IO| Railway
  Business -->|REST + Socket.IO| Railway
  TV -->|REST + Socket.IO| Railway

  Railway -->|Prisma transactions<br/>FOR UPDATE / SKIP LOCKED| Supabase
  Railway -->|Enqueue / claim jobs<br/>in PostgreSQL| Supabase
```

**Cost cut:** Remove Upstash. Keep one Node process for API + realtime + notification claiming.

---

## 3. Future optional architecture (Vercel + Supabase only)

Requires Socket.IO replacement + Nest re-platform — **not** recommended as first step.

```mermaid
flowchart TB
  subgraph Clients
    Portal[Customer Portal]
    Apps[Staff / Business / TV]
  end

  subgraph Hosting
    Vercel[Vercel<br/>Portal + maybe API routes]
    Supabase[(PostgreSQL)]
    RT[Supabase Realtime]
    Edge[Edge Functions / Cron<br/>notifications]
  end

  Portal --> Vercel
  Apps -->|REST| Vercel
  Apps -->|Realtime channels| RT
  Portal -->|Realtime channels| RT
  Vercel -->|SQL| Supabase
  Edge -->|claim jobs| Supabase
  Edge -->|Broadcast| RT
  Supabase --> RT
```

**Risk:** Auth/authorization must be redesigned to preserve Phase 10 contracts.

---

## 4. Realtime flow (current Socket.IO)

```mermaid
sequenceDiagram
  participant Client
  participant Nest as NestJS API
  participant DB as PostgreSQL
  participant SIO as Socket.IO /realtime
  participant Bus as NestEventBus

  Client->>SIO: connect + handshake.auth.token optional
  Client->>SIO: subscribe:* + credential
  SIO->>SIO: authorize then socket.join room
  SIO-->>Client: ack ok=true

  Client->>Nest: REST mutation callNext/join/...
  Nest->>DB: transaction FOR UPDATE
  DB-->>Nest: commit
  Nest->>Bus: publish domain events
  Bus->>SIO: bridge emit to rooms
  SIO-->>Client: CustomerCalled / QueueUpdated / ...

  Note over Client: On socket failure: HTTP polling fallback
```

---

## 5. Realtime flow (proposed Supabase Realtime — future)

```mermaid
sequenceDiagram
  participant Client
  participant Nest as NestJS API
  participant DB as PostgreSQL
  participant RT as Supabase Realtime

  Client->>Nest: obtain tracking/display/staff credential
  Client->>RT: subscribe private channel after server ACL

  Client->>Nest: REST mutation
  Nest->>DB: transaction commit
  Nest->>RT: Broadcast to authorized channels
  RT-->>Client: payload

  Note over Nest,RT: Prefer Nest-authorized Broadcast<br/>over raw Postgres Changes without RLS parity
```

---

## 6. Notification flow (current — Redis/BullMQ)

```mermaid
flowchart LR
  E[Domain event] --> B[QueueNotificationBridge]
  B --> D[NotificationDispatchService<br/>idempotent DB row]
  D --> Q[BullMQ Queue<br/>Redis]
  Q --> W[NotificationWorker<br/>in-process]
  W --> P[Provider Mock/WA/SMS]
  W -->|retry/DLQ| Q
  W -->|reconcile PENDING| D
```

---

## 7. Notification flow (proposed — PostgreSQL jobs)

```mermaid
flowchart LR
  E[Domain event] --> B[QueueNotificationBridge]
  B --> D[Idempotent notifications row]
  D --> J[notification_jobs table]
  J --> W[Worker claim<br/>FOR UPDATE SKIP LOCKED]
  W --> P[Provider]
  W -->|retry / terminal| J
  C[setInterval or Cron] --> W
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| Solid arrow | Implemented / recommended near-term |
| Future-only diagram §3 | Requires HIGH–VERY HIGH migration |
| Audit status | Diagrams reflect code inspection, not live billing |

*No infrastructure was created or destroyed for this document.*
