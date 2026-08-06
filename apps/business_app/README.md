# QueueFlow Business App

Flutter staff application for **Business Owner**, **Branch Manager**, **Receptionist**, and **Staff** to manage live queues.

## Quick start

```bash
cd apps/business_app
flutter pub get
dart run build_runner build --delete-conflicting-outputs

# Windows desktop
flutter run -d windows -t lib/main_dev.dart

# Or Chrome (web)
flutter run -d chrome -t lib/main_dev.dart
```

**Demo login** (after seed with `SEED_DEMO_PASSWORD`):

```bash
SEED_DEMO_PASSWORD="your-password" npm run db:seed   # in backend/
```

Then sign in with `owner@cafe-aroma.example.com` / the password you set.

## Stack

- Flutter · Riverpod · GoRouter · Freezed · Dio · Socket.IO
- Material 3 (`queueflow_theme`) · Hive offline cache
- Feature-first architecture with repository pattern

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — folder structure, navigation, socket design
- [Testing](docs/TESTING.md) — test suites and manual checklist
- [Realtime](../../docs/REALTIME.md) — server event mapping

## Environment

`.env.dev`:

```
API_BASE_URL=http://localhost:3000/api/v1
WS_BASE_URL=http://localhost:3000
```

## Features

| Area | Screens |
|------|---------|
| Auth | Login, forgot password, session persistence, token refresh |
| Dashboard | KPIs, queues, notifications, live socket |
| Branches | List, add, edit, delete, switch branch |
| Queues | List, detail, QR, settings, open/pause/resume/close |
| Queue console | Call next, hold, skip, recall, transfer, walk-in |
| Customers | Phone search, detail, queue history |
| Reports | Daily / weekly / monthly summaries |
| Staff | Invite (list via backend invitations API) |
| Settings | Business profile, dark mode, logout |

## Tests

```bash
flutter test
flutter test --update-goldens   # first golden run
```

## Roles

OWNER · MANAGER · RECEPTIONIST · STAFF · VIEWER — gated by JWT permissions.
