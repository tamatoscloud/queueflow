# queueflow_shared

The cross-app composition root. Re-exports every other `packages/*` package plus shared route-path constants that are common to more than one app.

**Depends on:** everything (`core`, `network`, `models`, `services`, `ui`, `widgets`, `theme`, `utils`). It is the *only* package allowed to do this — this is enforced by convention/code review, since Dart has no built-in dependency-boundary linter yet. See `docs/ARCHITECTURE.md` for the full dependency graph.

Apps import `package:queueflow_shared/queueflow_shared.dart` for composition (providers, routing constants) rather than depending on eight individual packages themselves.
