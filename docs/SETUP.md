# Development Setup

## Prerequisites

- Flutter SDK **3.38.0+** (Dart **3.10.0+** bundled) — `flutter --version` to check.
- Melos (installed automatically by the bootstrap script, or manually: `dart pub global activate melos`).
- Xcode (macOS, for iOS) / Android Studio + an emulator or device (for Android).
- For Firebase-backed features: the Firebase CLI + `flutterfire configure` (see `docs/ENVIRONMENT.md`).

## First-time setup

```bash
git clone <repo-url> queueflow
cd queueflow

# macOS/Linux
./scripts/bootstrap.sh

# Windows
./scripts/bootstrap.ps1
```

This runs `melos bootstrap` (installs and links every `apps/*` + `packages/*` package) and `melos run gen` (Freezed/json_serializable/Riverpod code generation). Re-run it any time you pull changes that touch a `pubspec.yaml` or a `@freezed`/`@riverpod` annotation.

## Running an app

Every mobile/web app has three flavors: `dev`, `staging`, `production`. Use the helper script:

```bash
# macOS/Linux
./scripts/run.sh customer_app dev
./scripts/run.sh business_app dev
./scripts/run.sh admin_panel dev
./scripts/run.sh marketing_website dev

# Windows
./scripts/run.ps1 -App customer_app -Flavor dev
```

Or run Flutter directly from an app's own directory:

```bash
cd apps/customer_app
flutter run --flavor dev -t lib/main_dev.dart      # mobile (Android/iOS)
```

```bash
cd apps/admin_panel
flutter run -t lib/main_dev.dart -d chrome          # web apps have no native flavor
```

> iOS flavors need a one-time manual Xcode step before `--flavor` resolves correctly — see `docs/ENVIRONMENT.md`.

## Common workspace commands (via Melos)

| Command | What it does |
|---|---|
| `melos bootstrap` | Fetches deps for every package/app and links local `path:` dependencies. |
| `melos run analyze` | `dart analyze --fatal-infos` across the whole workspace. |
| `melos run format` | Checks formatting (CI-safe, non-mutating). |
| `melos run format:fix` | Applies formatting. |
| `melos run test` | Runs `flutter test` for every package/app with a `test/` directory. |
| `melos run gen` | Runs `build_runner build --delete-conflicting-outputs` everywhere it's needed. |
| `melos run gen:watch` | Same, in watch mode, across all applicable packages concurrently. |
| `melos run gen:clean` | Removes generated (`.g.dart`/`.freezed.dart`) files. |

## Adding a new package

1. `packages/<name>/` with its own `pubspec.yaml` (`name: queueflow_<name>`, `publish_to: "none"`) and `analysis_options.yaml` containing `include: ../../analysis_options.yaml`.
2. Add its dependencies following the layering rules in `docs/ARCHITECTURE.md` — check you're not creating a cycle or letting a non-`shared` package depend on something above it in the graph.
3. Barrel file at `lib/queueflow_<name>.dart` exporting `src/*`.
4. `melos bootstrap` again so other packages/apps can add a `path:` dependency on it.

## Adding a new feature to an app

See `apps/customer_app/lib/features/README.md` (same convention in every app) for the `data/domain/presentation` layout. No feature scaffolding generator exists yet — copy the convention manually until one is added.

## Troubleshooting

- **"Missing required environment variable" at startup** — the flavor's `.env.<flavor>` file is missing a key `AppConfig.fromEnvMap` requires. Check `packages/core/lib/src/config/env_keys.dart` against the `.env.*` file for the app you're running.
- **`melos: command not found`** — re-run `scripts/bootstrap.sh`/`.ps1`, or `dart pub global activate melos` and ensure `~/.pub-cache/bin` (or `%APPDATA%\Pub\Cache\bin` on Windows) is on your `PATH`.
- **Stale generated code after editing a `@freezed`/`@riverpod` class** — `melos run gen`.
