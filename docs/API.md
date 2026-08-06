# QueueFlow REST API (v1)

Application layer built with NestJS. Source of truth for live contracts is
Swagger at `/docs` when the server is running. This document summarizes
conventions.

## Conventions

- **Base path:** `/api/v1`
- **Versioning:** URI (`VersioningType.URI`)
- **Success envelope:**

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 1 },
  "requestId": "uuid"
}
```

- **Error envelope:**

```json
{
  "success": false,
  "error": { "code": "QUEUE_NOT_FOUND", "message": "..." },
  "requestId": "uuid"
}
```

- **Request ID:** send `x-request-id` or receive one in the response header
  and body.
- **Pagination / filter / sort:** `page`, `pageSize`, `sortBy`, `sortOrder`,
  plus resource-specific filters (`businessId`, `status`, `search`, …).
- **Auth:** not implemented this sprint.

## Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Business owner / staff login → JWT + refresh token |
| POST | `/auth/refresh` | Public | Rotate refresh token |
| POST | `/auth/logout` | Bearer | Revoke current device session |
| POST | `/auth/logout-all` | Bearer | Revoke all sessions except current |
| POST | `/auth/password/forgot` | Public | Request password reset |
| POST | `/auth/password/reset` | Public | Reset password with token |
| POST | `/auth/email/verify` | Public | Verify email |
| POST | `/auth/email/resend` | Public | Resend verification email |

## Staff (`/api/v1/staff`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/staff/invitations` | `staff:invite` | Invite staff |
| POST | `/staff/invitations/accept` | Public | Accept invitation |
| POST | `/staff/invitations/:id/resend` | `staff:invite` | Resend invitation |
| PATCH | `/staff/:userId/disable` | `staff:invite` | Disable staff |
| PUT | `/staff/:userId/role` | `staff:manage_roles` | Change role |
| PUT | `/staff/:userId/branches` | `staff:manage_roles` | Assign branches |

## RBAC

Roles (seeded): `PLATFORM_ADMIN` (Super Admin), `OWNER`, `MANAGER`, `RECEPTIONIST`, `STAFF`, `VIEWER`.

Send `Authorization: Bearer <accessToken>` on protected routes. Customer QR join/snapshot/ETA endpoints remain `@Public()`.

## Module map

| Module | Responsibility |
|---|---|
| `business` | Tenant CRUD |
| `branch` | Branch CRUD (soft delete) |
| `queue` | Queue CRUD + open/pause/resume/close via Queue Engine |
| `queue-operations` | Join / staff ops / snapshot / ETA |
| `customer` | Active lookup + history |
| `notification` | Read notifications + delivery logs |
| `feedback` | Read feedback |
| `reports` | Metrics, snapshot, wait-time, daily summary |

Domain mutations for queues go through `QueueEngineService`; Prisma adapters
implement the engine ports. See [`QUEUE_ENGINE.md`](QUEUE_ENGINE.md).
