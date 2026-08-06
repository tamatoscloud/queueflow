# queueflow_core

Cross-cutting application core: `Flavor`, strongly-typed `AppConfig`, the `Result<T>`/`Failure` error-handling types, and the `AppLogger` contract. Pure Dart.

**Depends on:** `queueflow_utils`.

**Key exports:**
- `Flavor` — `dev` / `staging` / `production`.
- `AppConfig.fromEnvMap(Map<String, String> env, Flavor flavor)` — strongly-typed, fails fast on missing/malformed required keys. See `docs/ENVIRONMENT.md` at the repo root.
- `flavorProvider` / `appConfigProvider` — Riverpod providers with **no default**; every app must override them once at bootstrap.
- `Result<T>` / `Failure` — repositories return `Result<T>` instead of throwing.
- `AppLogger` / `appLoggerProvider` — swap the console logger for Sentry/Crashlytics in one place.

**Do not add here:** anything that imports `package:flutter` (keeps this package portable to a future Dart backend), or domain-specific failures (extend `Failure` in the consuming feature instead).
