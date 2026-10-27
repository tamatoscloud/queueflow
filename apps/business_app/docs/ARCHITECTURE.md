# QueueFlow Business App

Flutter tablet-first staff application for business owners, managers, receptionists, and staff to operate live queues.

## Stack

- Flutter (latest stable)
- Riverpod (state management)
- GoRouter (navigation)
- Freezed + json_serializable (auth models)
- Dio (REST via `queueflow_network`)
- Socket.IO client (live queue updates)
- Material 3 (`queueflow_theme`)
- Hive offline cache (`queueflow_services`)

## Folder structure

```
apps/business_app/lib/
├── app.dart                    # MaterialApp.router
├── bootstrap.dart              # DI composition root
├── main_{dev,staging,production}.dart
├── core/
│   ├── cache/                  # Offline cache service
│   ├── models/                 # API DTOs
│   ├── network/                # Dio, API client, envelope parser
│   ├── realtime/               # Socket.IO client
│   ├── routing/                # Route path constants
│   └── session/                # Branch selection persistence
├── features/
│   ├── auth/                   # Login, forgot password, session
│   ├── dashboard/
│   ├── branches/
│   ├── queues/
│   ├── queue_console/          # Live operator console
│   ├── customers/
│   ├── reports/
│   ├── settings/
│   ├── staff/
│   ├── notifications/
│   └── shell/                  # Adaptive navigation shell
├── routes/app_router.dart
├── shared/widgets/             # Skeletons, async states
└── theme/theme_mode_provider.dart
```

## Architecture

```
Presentation (screens, Riverpod providers)
        │
        ▼
BusinessApiClient / AuthRepository
        │
        ▼
Dio + AuthTokenInterceptor + envelope parser
        │
        ▼
QueueFlow REST API (/api/v1)
```

Realtime path:

```
Queue Console / Dashboard
        │
        ▼
RealtimeClient (Socket.IO /realtime + JWT)
        │
        ▼
subscribe:business-dashboard | subscribe:queue-detail
        │
        ▼
Invalidate Riverpod providers → REST refresh
```

See [`docs/REALTIME.md`](../../../docs/REALTIME.md) for server-side event mapping.

## Navigation

| Route | Screen |
|-------|--------|
| `/login` | Login |
| `/forgot-password` | Password reset request |
| `/dashboard` | Dashboard KPIs |
| `/queues` | Queue list |
| `/queues/:id` | Queue detail + QR |
| `/queues/:id/console` | Operator console |
| `/queues/:id/settings` | Capacity, service time |
| `/branches` | Branch CRUD + switch |
| `/customers` | Phone lookup |
| `/customers/:id` | History |
| `/reports` | Daily / weekly / monthly tabs |
| `/notifications` | Delivery history |
| `/settings` | Profile, branding, logout |
| `/staff` | Invite staff |

**Tablet:** `NavigationRail` (extended)  
**Phone:** `NavigationBar` (5 primary destinations)

## Run

```bash
cd apps/business_app
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run -t lib/main_dev.dart
```

Demo login (after backend seed): `owner@cafe-aroma.example.com` / `Password123!`

## Environment (`.env.dev`)

```
API_BASE_URL=http://localhost:3000/api/v1
WS_BASE_URL=http://localhost:3000
```

## Testing

```bash
flutter test
```

| Suite | Coverage |
|-------|----------|
| `test/auth_user_test.dart` | Auth model JSON |
| `test/widget_test.dart` | StatCard widget + golden |

## Performance notes

- Socket events trigger targeted provider invalidation (no full-app rebuild)
- `RefreshIndicator` on all list screens
- Hive cache layer for offline reads (`OfflineCacheService` + `cachedFetchList`)
- `OfflineBanner` shows connectivity state via `connectivity_plus`
- Tablet landscape uses split console layout (waiting list + current customer)
- Dio token refresh interceptor avoids redundant logins

## Roles supported

OWNER · MANAGER · RECEPTIONIST · STAFF · VIEWER — permissions gate staff invite, queue operate, and reports via JWT claims.
