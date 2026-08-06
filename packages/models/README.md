# queueflow_models

Shared, framework-agnostic data contracts (Freezed + `json_serializable`). Pure Dart.

**Depends on:** `queueflow_core`.

Currently contains only generic wire-format envelopes:
- `ApiEnvelope<T>` — the backend's `{ success, data, message }` response shape.
- `PaginatedResponse<T>` — generic page/list envelope.

**Adding a domain model:** follow the same pattern — a `@Freezed` class with `fromJson`/`toJson`, one file per model under `lib/src/<domain>/`, exported from `lib/queueflow_models.dart`. No domain models (User, Business, Queue, Ticket, ...) are implemented yet; that is business logic and out of scope for this scaffold.
