# QueueFlow Super Admin Portal

Internal SaaS administration portal for **PLATFORM_ADMIN** users. Built with Flutter Web, Riverpod, GoRouter, Dio, Material 3, and `fl_chart`.

## Features

| Area | Capabilities |
|------|----------------|
| **Dashboard** | Platform KPIs, system health summary, activity chart |
| **Tenants** | List, search, create, view, deactivate, soft-delete businesses |
| **Branches** | Per-tenant branch list with queue/staff counts |
| **Users** | Platform admins, owners, managers, staff — search, suspend, reset password |
| **Subscriptions** | Plans, trial/period status, manual overrides |
| **Notifications** | Delivery stats, failed list, retry |
| **Audit** | Searchable audit log |
| **Support** | Tickets — create, status/priority updates |
| **Feature flags** | Global toggles (per-business via API) |
| **Health** | Redis, database, Socket.IO, notification workers |
| **Analytics** | Business growth, wait times, notification success |
| **Settings** | Environment info, session/security notes |

## Prerequisites

- Flutter SDK ≥ 3.38
- QueueFlow backend running with platform admin APIs (`/api/v1/platform/*`)
- Platform admin user (seed: `ops@queueflow.app`)

## Run locally

```bash
cd apps/admin_panel
flutter pub get
flutter run -d chrome --dart-define=FLAVOR=dev -t lib/main_dev.dart
```

Configure API URL in `.env.dev`:

```
API_BASE_URL=http://localhost:3000/api/v1
WS_BASE_URL=http://localhost:3000
APP_NAME=QueueFlow Admin
```

## Authentication

- JWT login via `POST /auth/login`
- Refresh token rotation via `POST /auth/refresh`
- Tokens persisted in `flutter_secure_storage` (web: encrypted local storage)
- **Non–platform-admin users are rejected** at login even with valid credentials

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Testing

```bash
flutter test
flutter test --update-goldens   # refresh golden baselines
```

See [TESTING_REPORT.md](TESTING_REPORT.md).

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) and [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
