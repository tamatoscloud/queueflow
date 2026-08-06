# Database Design Decisions

This document explains *why* `backend/prisma/schema.prisma` is shaped the
way it is. Read [`PROJECT.md`](../PROJECT.md) first if you haven't — several
decisions below only make sense in light of the QR-landing-page product
flow (no customer login, no customer app).

Scope reminder: this task was **database layer only**. No API framework,
no ORM query code beyond the seed script, no UI. Anything below that
mentions "the API layer" is describing a constraint the future API must
satisfy, not something implemented here.

## Stack decision this task made

Prisma requires a Node.js/TypeScript runtime, so choosing "Prisma schema"
(the user's explicit instruction) implicitly decided the **data-access
layer's** language: Node.js + TypeScript + PostgreSQL. This does **not**
decide the API framework (NestJS/Express/Fastify/etc.) — `backend/README.md`
has been updated to reflect exactly this: ORM/DB decided, API framework
still open. The schema targets **Supabase PostgreSQL** (or any managed
Postgres instance) via `DATABASE_URL`.

## Conventions applied to (almost) every table

### UUID primary keys

`@id @default(uuid())` — Prisma-generated UUID v4, client-side, portable
across databases. **Scalability trade-off, called out explicitly per
requirement #7:** random UUIDv4 primary keys fragment B-tree indexes
under high insert volume (no locality), unlike an auto-increment int or a
time-ordered id (ULID / UUIDv7). This schema keeps UUIDv4 for now because:

1. It's zero-configuration and needs no Postgres extension.
2. Every hot insert path (`QueueEntry`, `QueueToken`, `NotificationLog`)
   already has a `createdAt`-leading index for its actual query pattern,
   which is what matters for *read* performance; the *write*-amplification
   cost of UUIDv4 primary keys only becomes a real problem at a scale
   (sustained tens of millions of rows/table with heavy concurrent
   inserts) this product isn't at yet.
3. If/when it becomes a problem, swapping to Postgres 18's native
   `uuidv7()` (or an application-side ULID) is a value-generation change,
   not a schema/relationship change — ids stay `uuid` columns throughout.

### `createdAt` / `updatedAt` / `deletedAt` / `createdBy` / `updatedBy`

Applied to every table that represents mutable, tenant-owned data, per
requirement #5. Three categories of **explicit, documented exceptions**:

| Exception | Tables | Why |
|---|---|---|
| No `deletedAt`/`updatedAt`/`updatedBy` | `AuditLog`, `NotificationLog` | Immutable, append-only logs. "Editing" or "deleting" an audit/delivery-attempt record defeats its purpose; they only ever get a `createdAt`. |
| Only `createdAt`/`createdBy` (no `updatedAt`) | `RolePermission`, `UserRole`, `UserBranch`, `WorkingHours` | Pure link/config rows with no mutable fields of their own — a "change" is always a delete-and-recreate (e.g. re-granting a permission), not an in-place update. |
| No `deletedAt` at all | `QueueToken`, `DeviceSession`, `Holiday`, `QRCode`'s scan counters (n/a, only the parent row) | `QueueToken` uses its own `status: VOID` for the equivalent concept (voiding a token is a distinct, auditable action, not a generic soft-delete); `DeviceSession` uses `revokedAt`; `Holiday` rows are simple config with no compliance reason to preserve tombstones. |

### Why `createdBy`/`updatedBy` are plain UUID columns, not FK relations

Two reasons, both load-bearing:

1. **Not every creator is a `User`.** A `QueueEntry`/`Customer`/`Notification`
   created via the QR landing page has no authenticated staff user behind
   it — the actor is the customer themselves (no `User` row exists for
   them at all, by design; see `PROJECT.md`). A hard FK to `User` would
   force either a nullable-but-still-constrained relation or fake system
   `User` rows to represent "the public"; a plain UUID sidesteps both.
2. **Relation-name explosion.** Prisma requires a unique relation name
   wherever more than one field on a model points at the same target
   model. With ~20 tables all wanting `createdBy: User`/`updatedBy: User`,
   every single one would need `@relation("XCreatedBy")`/`@relation("XUpdatedBy")`
   pairs and matching (unused) back-relation arrays on `User` — dozens of
   fields on `User` that exist purely for referential bookkeeping, no
   query ever uses them, and every future table pays the same tax.

The trade-off: the database cannot enforce "createdBy must reference a
real `User`" by itself. This is intentional — it belongs to the
application layer, which already knows the difference between a
staff-actor mutation and a customer-actor mutation and can validate
against the right source (a `User` id or a `Customer` id) instead of a
one-size-fits-wrong FK. Genuine actor auditing that *does* need a real FK
already has one: `AuditLog.actorUserId` and `QueueEntry.calledByUserId`/
`servedByUserId` are real relations, because those are always staff
actions.

## Multi-tenancy: `businessId`-everywhere + Row-Level Security

Every tenant-owned table carries `businessId` **directly**, even where
it's reachable in one hop through another FK (e.g. `QueueEntry.businessId`
duplicates `QueueEntry.queue.branch.businessId`). This is deliberate
denormalization for two reasons:

1. **Query performance** — tenant-scoped list/report queries (the
   overwhelming majority of this product's query load) filter on
   `businessId` without a join, and every such table has a `businessId`-
   leading index.
2. **Row-Level Security (RLS)** — migration
   `20260717131500_partial_unique_indexes_and_rls` enables Postgres RLS
   on every table with a direct `businessId` column, with a
   `tenant_isolation` policy:

   ```sql
   CREATE POLICY tenant_isolation ON <table>
     USING (business_id = current_setting('app.current_business_id', true)::uuid);
   ```

   **How far this goes, and what's still the API layer's job:** RLS here
   is a defense-in-depth backstop against an application-layer bug
   leaking cross-tenant rows (e.g. a forgotten `WHERE businessId = ...`
   clause) — it is *not* a full multi-tenant auth system by itself. The
   future API must, per request: (a) resolve the authenticated user's
   `businessId`, (b) run `SET LOCAL app.current_business_id = '<uuid>'`
   inside the same transaction as the query, using its own tenant-scoped
   Postgres role (not the migration/seed role), and (c) use the separate
   `queueflow_platform_admin` role (created, `BYPASSRLS`, in the same
   migration) for `admin_panel`'s cross-tenant access and for
   `prisma migrate`/`prisma db seed`. None of that connection/session
   wiring exists yet — it's flagged here so it isn't lost when the API is
   built.

`Permission` and `SubscriptionPlan` are the two tables **without** a
`businessId` — both are genuinely platform-level catalogs, not
tenant-owned data, so RLS does not apply to them.

## Soft delete vs. uniqueness: partial unique indexes

`@@unique`/`@unique` in Prisma's schema DSL has no `WHERE` clause, so it
cannot express "unique among non-deleted rows" — a plain unique
constraint would permanently block reusing a value (e.g. a business's
email, a customer's phone number) after the original row is soft-deleted.
Prisma's schema language doesn't support partial/filtered indexes as of
this writing, so every constraint below is declared as a plain
(non-unique) `@@index` in `schema.prisma` and the *actual* uniqueness is
a hand-written partial unique index in migration
`20260717131500_partial_unique_indexes_and_rls`:

- `businesses.slug`, `businesses.email`
- `branches (business_id, code)`
- `users.email`
- `customers (business_id, phone)`
- `queues (branch_id, name)`
- `roles.name` where `business_id IS NULL` (system roles) — and
  `roles (business_id, name)` where `business_id IS NOT NULL` (custom
  roles), as **two separate** partial indexes, because Postgres treats
  every `NULL` as distinct in a normal unique index and would otherwise
  silently allow duplicate system-role names.
- `subscriptions.business_id` where `status IN ('TRIALING','ACTIVE','PAST_DUE')`
  — see "Why there's no `Business.activeSubscriptionId` pointer" below.

**Known trade-off of this approach:** because these constraints live
outside `schema.prisma`, running `prisma migrate dev` again in the future
(to add an unrelated column, say) will not know about them and could
generate a diff that conflicts with or duplicates this migration.
Anyone adding new migrations after this one should run
`prisma migrate diff` against the *migrations folder*, review the
generated SQL by hand, and re-add any partial indexes Prisma's diff
engine doesn't understand, rather than trusting `migrate dev` blindly.

## Queue mechanics

### Why `QueueToken` is a separate table from `QueueEntry`

`QueueToken` is the atomic sequence + human-facing display code
("A-023"); `QueueEntry` is the mutable record of a customer's
participation (status, timestamps, who called/served them). Splitting
them:

- Lets a token be **voided** (`QueueTokenStatus.VOID`) independently of
  whatever happens to the entry, and keeps the append-only-ish sequence
  ledger (`queue_tokens`) from being churned by the same UPDATEs that
  hit `queue_entries` dozens of times per visit (`WAITING` → `CALLED` →
  `COMPLETED`, etc.).
- Makes the uniqueness of `(queueId, issuedDate, tokenNumber)` a property
  of the ledger itself, not entangled with entry status.

### Token issuance concurrency

`Queue.lastTokenNumber` is a plain `Int` column, incremented by the
application layer with a single statement:

```sql
UPDATE queues
SET last_token_number = last_token_number + 1
WHERE id = $1
RETURNING last_token_number;
```

This is safe under concurrent joins without a separate
`SELECT ... FOR UPDATE`: Postgres takes a row-level lock for the duration
of the `UPDATE` itself, so two simultaneous joins to the same queue are
serialized by Postgres, not by application logic. `Queue.lastTokenResetAt`
records when the counter was last zeroed for the daily reset (a scheduled
job's job, not the database's — out of scope here).

### `NotificationPreference` vs. `NotificationChannel`

The customer's join-time choice ("WhatsApp / SMS / Both", requirement #4)
is `NotificationPreference` on `QueueEntry` — `BOTH` is a valid value
because it's a *preference*, not a wire protocol. When the application
actually sends a message, it fans a `BOTH` preference out into two
`Notification` rows, each with a single `NotificationChannel`
(`WHATSAPP` or `SMS` — `EMAIL` reserved per requirement #4's "future").
Collapsing these into one enum would make "send on both channels" either
impossible to represent per-message or require a channel value that
isn't a real channel.

### `Notification` vs. `NotificationLog`

`Notification` is "we intend to tell this customer X" (created once);
`NotificationLog` is "attempt N to actually deliver it" (one row per
provider call/webhook). This separation exists because delivery is
retried and providers push asynchronous status webhooks
(`SENT` → `DELIVERED` → `READ`) well after the `Notification` itself was
created — mutating a single row per message would either lose attempt
history or require ad-hoc JSON-array bookkeeping inside one column.
`Notification.status` is a denormalized "latest known state" so list
views don't need to join to the newest `NotificationLog` row.

## Roles & permissions

`Role.businessId` is nullable: `NULL` rows are the four system roles
(`OWNER`, `MANAGER`, `STAFF`, `VIEWER`) plus `PLATFORM_ADMIN`, shipped by
QueueFlow and available to every tenant without being duplicated per
business; non-`NULL` rows are a specific business's own custom roles.
`RolePermission`/`UserRole`/`UserBranch` are plain join tables (composite
primary keys, no surrogate `id`) — nothing about a role-permission grant
or a user-role assignment needs to be referenced from elsewhere, so a
surrogate id would be pure overhead.

`UserBranch` exists separately from `UserRole` because branch access and
role are independent axes: a `MANAGER` might be scoped to one branch or
five, and that shouldn't require five different role rows.

## Why there's no `Business.activeSubscriptionId` pointer

An earlier draft of this schema had `Business.activeSubscriptionId`
pointing at the current `Subscription`, for O(1) lookup. It was removed:
`Business → Subscription` (via that pointer) plus `Subscription →
Business` (via `businessId`, needed for history) is a circular table
dependency for a marginal benefit — `Subscription`'s
`(businessId, status)` index already makes "find the current
subscription" a fast, indexed lookup. Instead, correctness is enforced
by the partial unique index in "Soft delete vs. uniqueness" above: at
most one `Subscription` per business can be in a non-terminal status at
a time, and full upgrade/downgrade/renewal history is preserved as
ordinary rows.

`SubscriptionPlan` uses `isActive` (sellable today) as a distinct concept
from `deletedAt` (true catalog removal) specifically because
`Subscription.planId` is `onDelete: Restrict` — a plan with any
`Subscription` referencing it, past or present, can never be hard-deleted,
only retired via `isActive = false`.

## Cascade rules — summary of non-obvious choices

Most parent→child relationships are `onDelete: Cascade` (deleting a
`Business` deletes its `Branch`es, `Queue`s, etc.) since in practice
these are always soft-deleted at the application layer, not hard-deleted.
The deliberate exceptions:

| Relation | Rule | Why |
|---|---|---|
| `AuditLog.businessId`, `AuditLog.actorUserId` | `SetNull` | The audit trail must outlive the business or user it describes. |
| `QueueEntry.calledByUserId`/`servedByUserId` | `SetNull` | Losing the staff account shouldn't erase queue history — just anonymize the actor. |
| `StaffInvitation.invitedByUserId`/`acceptedByUserId` | `SetNull` | Same reasoning as above. |
| `Subscription.planId` | `Restrict` | Prevents retiring a plan out from under active/historical subscriptions — force `isActive = false` instead. |
| `StaffInvitation.roleId` | `Restrict` | A role can't disappear out from under a pending invitation; revoke/expire the invitation first. |
| `QRCode.queueId` | `SetNull` | A QR code printed and stuck on a table should degrade to "pick a queue" rather than 404 if the specific queue it pointed to is removed. |
| `Notification.queueEntryId` | `SetNull` | Notification delivery history is kept even if the originating queue entry is later purged (e.g. GDPR-style erasure). |

## Indexing strategy (requirement #7)

Every index below maps to a concrete, named access pattern rather than
being speculative:

- **Fast queue lookup / real-time tracking page:** `QueueEntry(queueId, status, joinedAt)` is the "who's currently waiting, in order" query the live tracking page and staff dashboard both run continuously.
- **Branch/business dashboards & reporting:** `QueueEntry(branchId, status)` and `QueueEntry(businessId, createdAt)`; `Feedback(branchId, submittedAt)` and `Feedback(businessId, rating)`.
- **Customer history / CRM:** `Customer(businessId, phone)`, `Customer(businessId, lastVisitAt)`, `QueueEntry(customerId)`.
- **Notification dispatch worker:** `Notification(status, scheduledAt)` — a worker polling for due sends filters exactly on this pair; `Notification(customerId, status)` for a customer's own notification history.
- **Webhook correlation:** `NotificationLog(providerMessageId)` — inbound delivery-status webhooks arrive keyed by the provider's own message id, not QueueFlow's.
- **Compliance/audit queries:** `AuditLog(businessId, createdAt)`, `AuditLog(entityType, entityId)`.

## Scalability notes beyond the schema itself

These are flagged for future work, not implemented (out of scope for a
database-layer-only task):

- **Real-time updates:** the schema doesn't push anything by itself — a
  `QueueEntry` status change is just an `UPDATE` plus its `updatedAt`
  bump. The live tracking page needs a push mechanism on top; the
  **Upstash Redis** (or local Redis in development) is the natural
  pub/sub layer for that (API layer publishes on status change,
  subscribes per open tracking-page connection), not the database.
- **High-volume table partitioning:** `QueueEntry`, `NotificationLog`,
  and `AuditLog` are the three tables that grow unboundedly and fastest.
  If/when a single tenant's `QueueEntry` history reaches tens of millions
  of rows, Postgres native range partitioning by `createdAt` (monthly)
  is the standard next step — deferred because it adds real operational
  complexity (partition maintenance, `pg_partman` or an equivalent) this
  product doesn't need yet.
- **Read replicas:** reporting/analytics queries (`reports:view`
  permission) are natural candidates to route to a read replica once one
  exists, since none of this schema's indexes assume synchronous
  consistency for that workload.

## Migrations in this repository

Two migrations, in order:

1. `20260717130000_init` — the full schema above, generated **offline**
   (no live database required) via
   `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.
   This is the standard way to produce an initial migration without a
   database connection; it was verified with `prisma validate` and
   `prisma generate` (both passed), but has **not** been applied against
   a real Postgres instance in this environment — see `backend/README.md`
   "Running the migrations" and `docs/ENVIRONMENT.md`.
2. `20260717131500_partial_unique_indexes_and_rls` — hand-authored raw
   SQL for the two Postgres features Prisma's schema DSL can't express
   yet (partial unique indexes, Row-Level Security). See the two
   sections above for exactly what it does and why it's separate.

`backend/prisma/seed.ts` was type-checked (`npm run typecheck`) against
the generated Prisma Client but, for the same reason, has not been
executed against a real database in this environment. Once a Postgres
instance is reachable (set `DATABASE_URL` in `backend/.env.local` per
`docs/ENVIRONMENT.md`), the intended sequence is:

```bash
npm install
npm run prisma:migrate:deploy   # applies both migrations, in order
npm run db:seed
```
