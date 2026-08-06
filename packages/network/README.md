# queueflow_network

Dio client construction, interceptors, and typed exception mapping. Pure Dart (Dio does not require the Flutter SDK).

**Depends on:** `queueflow_core`, `queueflow_models`, `queueflow_utils`.

**Key exports:**
- `DioClientFactory.create(...)` — builds a configured `Dio` from `AppConfig` values (base URL, timeouts, logging).
- `DioClientFactory.mapError(DioException)` → `ApiException` — closed, pattern-matchable exception set.
- `AuthTokenInterceptor` — attaches a bearer token via an injected callback (no direct dependency on `queueflow_services`, to avoid a dependency cycle).
- `dioProvider` — Riverpod provider with no default; overridden at app bootstrap once `AppConfig` is available.

**Do not add here:** repository implementations or endpoint definitions — those belong to each feature's `data/` layer in the consuming app.
