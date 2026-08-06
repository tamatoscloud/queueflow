# Architecture

QueueFlow is a Melos-managed monorepo containing five apps (`apps/*`) and nine shared Dart/Flutter packages (`packages/*`). This document is the source of truth for *why* the workspace is shaped this way — read it before adding a new package or moving code between layers.

## Monorepo tool: Melos, not native `pub` workspaces

Dart 3.6+ ships native `pub workspaces`, but Flutter's flavor/asset/platform tooling doesn't fully embrace it yet, and it forces a single dependency-version resolution across every app. Melos is the established standard for Flutter monorepos: every package keeps its own `pubspec.yaml` (independently versionable/publishable later), while `melos bootstrap` still gives us a single `pub get` pass and workspace-wide scripts (`melos run analyze|format|test|gen`).

## Package dependency graph (strictly acyclic)

```
queueflow_utils   (pure Dart, leaf)
queueflow_theme   (Flutter; design tokens only)
        │
queueflow_core     → utils                          (pure Dart)
queueflow_models   → core                           (pure Dart)
queueflow_network  → core, models, utils            (pure Dart — Dio doesn't need Flutter)
queueflow_ui       → theme                          (Flutter; design-system atoms)
queueflow_widgets  → ui, theme, utils                (Flutter; composed molecules)
queueflow_services → core, network, models, utils    (Flutter — every plugin needs it)
queueflow_shared   → core, network, models, services, ui, widgets, theme, utils   (composition root)
        │
apps/*  → queueflow_shared (+ any package directly, for types)
```

**Why `core`/`models`/`network` are pure Dart:** they never import `package:flutter`. `AppConfig` (in `core`) takes a plain `Map<String, String>`, not a `flutter_dotenv` instance, specifically so it stays portable to a future Dart backend and is trivially unit-testable without the Flutter test harness. `network`'s Dio client factory works the same way — Dio itself has no Flutter dependency.

**Why `services` must be Flutter:** every plugin it wraps (Hive's `hive_flutter` init, `flutter_secure_storage`, `firebase_messaging`, `mobile_scanner`, `permission_handler`) requires the Flutter engine. Feature code never imports these plugins directly — it depends on the interfaces (`StorageService`, `NotificationService`, `ScannerService`, `PermissionService`, `SecureStorageService`) via Riverpod providers, which is what makes swapping an implementation (or mocking it in tests) a one-file change.

**Why `theme`/`ui`/`widgets` are three separate packages, not one:**
- `theme` = tokens only (`AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`, `Breakpoints`, `AppTheme`). No widgets, so non-visual code (e.g. a future PDF/export generator) can depend on tokens without pulling in widget code.
- `ui` = atoms built directly on tokens (`AppPrimaryButton`, `AppTextField`, `AppLoadingIndicator`). This is the design-system layer.
- `widgets` = composed molecules/organisms built from `ui` + `theme` (`EmptyStateView`, `LoadingOverlay`). Kept separate from `ui` so atoms stay swappable without touching every composed widget that uses them.

**Why `shared` is allowed to depend on everything:** it's the single composition root. Apps import `package:queueflow_shared/queueflow_shared.dart` to get every package's public API plus cross-app glue (currently `SharedRoutePaths`), instead of listing eight separate package dependencies and re-inventing the wiring in each app. This boundary (only `shared` may depend on everything) is enforced by convention/code review today — Dart has no built-in architectural-boundary linter; see `docs/CONTRIBUTING.md` for how PR review should catch violations.

## Feature-First architecture inside each app

Every app's `lib/` has exactly: `core/`, `features/`, `shared/`, `routes/`, `services/`, `models/`, `widgets/`, `theme/`. The distinction from `packages/*`:

| Layer | Scope | Example |
|---|---|---|
| `packages/*` | Reusable across **all five apps** | `queueflow_ui`'s `AppPrimaryButton` |
| app-level `core/services/models/widgets/shared/theme` | Specific to **this app only** — mostly thin wiring/config, not new abstractions | this app's Hive box name, this app's `ThemeMode` preference provider |
| `features/<feature>/{data,domain,presentation}` | A vertical product slice | Business app queues, customer portal join flow, admin tenants, … |

A feature depends on `packages/*`; it never depends on another feature directly. Cross-feature state goes through a provider in `packages/shared` or the app's own `shared/`.

Nothing under `features/` is implemented in this scaffold — each app has a `features/README.md` describing the convention instead. The one screen that *does* exist (`routes/app_router.dart`'s `_BootstrapVerificationScreen`) is explicitly not a feature: it exists only to prove env → DI → router → theme wiring works end-to-end, and should be deleted once the first real feature route replaces it.

## Environment management

- **Flutter:** native Android product flavors / iOS build configurations (`dev`/`staging`/`production`) select the entrypoint (`main_dev.dart`, etc.), which loads the matching `.env.*` file via `flutter_dotenv` and parses it into a strongly-typed `AppConfig` (`packages/core`). `AppConfig`/`Flavor` are exposed as Riverpod providers with **no default** — they throw `UnimplementedError` if not overridden, so a missing override at bootstrap fails immediately instead of silently defaulting to the wrong environment. Full detail: `docs/ENVIRONMENT.md`.
- **Backend:** NestJS application layer (`backend/src/modules/*`) over
  Prisma + the Queue Engine (`backend/src/queue-engine/`). See
  [`QUEUE_ENGINE.md`](QUEUE_ENGINE.md) and [`API.md`](API.md). Auth, Socket.IO
  realtime (`docs/REALTIME.md`), and notifications (`docs/NOTIFICATIONS.md`).
  `backend/ENV_SCHEMA.md` documents the environment contract.

## Dependency Injection

Riverpod end-to-end — no second DI mechanism (e.g. `get_it`) to avoid two competing systems. Cross-cutting services/clients are interfaces + Riverpod providers; concrete implementations are bound once at each app's composition root (`bootstrap.dart`). Tests override providers directly (see each app's `test/widget_test.dart`) instead of mocking a service locator.

## Responsiveness

No third-party responsive-layout package. `packages/theme`'s `Breakpoints` (mobile/tablet/desktop) plus `MediaQuery`/`LayoutBuilder` covers `customer_app`'s responsive requirement and `business_app`'s tablet-optimized requirement without adding a dependency outside what was explicitly requested.

## Web apps: `admin_panel` and `marketing_website`

Not specified in the original tech list, so this is a documented decision: both are **Flutter Web**, to maximize reuse of `theme`/`ui`/`widgets`/`core` (and `models`/`network`/`services` where relevant) across all five apps under one toolchain. Trade-off: a marketing site usually benefits from SSR/SEO (e.g. Next.js), which Flutter Web doesn't provide. If SEO becomes a real requirement, `marketing_website` can be swapped to a JS framework in isolation — it depends on the fewest shared packages of the five apps by design (no `network`'s `AuthTokenInterceptor`, no `services`, no `models`).

## A note on `queueflow_services` and `build_runner`

`queueflow_services` deliberately has **no** `build_runner` dev dependency, even though every other package that could plausibly need codegen has one. `mobile_scanner`/`permission_handler`'s newer platform implementations pull in `jni`/`objective_c` — packages that use Dart's native-assets "build hooks" — which currently breaks `build_runner`'s build-script compilation step outright (`'dart compile' does not support build hooks, use 'dart build' instead`), independent of whether the package has any `@freezed`/`@riverpod` code to generate. Since `queueflow_services` has none today, the fix is simply not to depend on `build_runner` here. If this package ever needs generated code, re-add the dependency and re-test — the underlying incompatibility is a `build_runner`/Dart-native-assets ecosystem issue, not an architectural one, and may be resolved upstream by then.

## Code generation & linting

Freezed + `json_serializable` + `riverpod_generator`, run via `melos run gen` (wraps `dart run build_runner build --delete-conflicting-outputs` for every package that depends on `build_runner`). Lints: `flutter_lints` + `strict-casts`/`strict-inference`/`strict-raw-types` + `directives_ordering` for import ordering, defined once in the root `analysis_options.yaml` and `include`d by every package/app — see `docs/CONTRIBUTING.md`.
