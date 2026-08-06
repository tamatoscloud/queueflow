# Super Admin Portal — Architecture

## Overview

`apps/admin_panel` is a Flutter Web client for QueueFlow platform operators. It consumes backend routes under `/api/v1/platform/*`, gated by `platform:manage_tenants` and `isPlatformAdmin`.

```
┌─────────────────────────────────────────────────────────┐
│  Flutter Web (admin_panel)                              │
│  Riverpod · GoRouter · Dio · Material 3 · fl_chart      │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS /api/v1
┌──────────────────────────▼──────────────────────────────┐
│  NestJS PlatformAdminModule                             │
│  /platform/dashboard · /businesses · /users · …         │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    PostgreSQL          Redis           Notifications
    (Prisma)         (health)            (retry)
```

## Layering

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Presentation | `lib/features/*/…_screen.dart` | UI, Riverpod `FutureProvider`s |
| Application | `lib/features/auth/presentation/auth_controller.dart` | Session state |
| Data | `lib/core/network/platform_api_client.dart` | HTTP to platform APIs |
| Auth | `lib/features/auth/data/` | Login, token storage, refresh |

## Routing

- Public: `/login`
- Authenticated shell (`AdminShell`): dashboard, tenants, branches, users, subscriptions, notifications, audit, support, feature flags, health, analytics, settings
- Detail: `/tenants/:id`

`GoRouter` redirect waits for `sessionInitProvider` before sending unauthenticated users to login.

## Responsive layout

- **Desktop / tablet (≥ breakpoint):** `NavigationRail` (extended at ≥1200px)
- **Narrow:** bottom `NavigationBar` (first 5 items) + drawer for remaining routes

## Shared packages

Reuses monorepo packages: `queueflow_shared`, `queueflow_network`, `queueflow_theme`, `queueflow_ui`, `queueflow_models`, `queueflow_utils`.

## Backend contract

All platform endpoints require:

1. Valid JWT
2. Permission `platform:manage_tenants`
3. `user.isPlatformAdmin === true`

Queue Engine logic is **not** modified by this app; operations go through existing platform-admin service methods.

## Security notes

- Admin tokens stored with `qf_admin_*` keys (separate from business app)
- No API keys or secrets in client code
- Platform admin-only gate on client and server
