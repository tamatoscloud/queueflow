# features/

Feature-first modules. Each feature is a vertical slice:

```
features/
  <feature_name>/
    data/           # DTOs (or reuse packages/models), repository implementations
    domain/         # repository interfaces, use-cases, entities
    presentation/   # screens, widgets, controllers/notifiers
    routes.dart      # this feature's GoRoute list, merged into routes/app_router.dart
```

Conventions:
- A feature depends on `packages/*` (core, network, models, services, ui, widgets, theme, utils) — never on another feature directly. Cross-feature communication goes through a shared provider/service in `packages/shared` or this app's `shared/`.
- `presentation/` widgets compose `queueflow_ui` + `queueflow_widgets`; they do not redefine buttons/inputs/colors.
- Repository implementations return `Result<T>` from `queueflow_core`, not raw exceptions.

No features are implemented yet — this scaffold intentionally stops at the architecture layer.
