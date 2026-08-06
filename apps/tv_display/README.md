# QueueFlow TV Display

Flutter Web application for large-screen queue boards in branch lobbies.

## Quick start

```bash
cd apps/tv_display
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Ensure the backend is running (`http://localhost:3000`) with CORS allowing the Flutter Web origin.

## Operating modes

| Mode | Description |
|------|-------------|
| **Public** | Enter display code or Queue ID — no login |
| **Staff configuration** | Owner/Manager signs in, selects branch/queue/theme |

Configuration is persisted locally (Hive). See [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Tests

```bash
flutter test
```

See [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md).
