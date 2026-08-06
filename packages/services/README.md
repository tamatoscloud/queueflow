# queueflow_services

Concrete infrastructure services behind narrow interfaces: `StorageService` (Hive), `SecureStorageService` (flutter_secure_storage), `NotificationService` (Firebase Messaging), `ScannerService` (mobile_scanner), `PermissionService` (permission_handler). Flutter-only, since every plugin here requires it.

**Depends on:** `queueflow_core`, `queueflow_network`, `queueflow_models`, `queueflow_utils`.

Every service is exposed only via its interface + a Riverpod provider (`storageServiceProvider`, `notificationServiceProvider`, etc.) so features never instantiate a concrete class or import a plugin package directly — this is what makes swapping Hive for something else, or mocking storage in tests, a one-file change.

**Manual setup required before these work at runtime:**
- Firebase: run `flutterfire configure` per app and add `google-services.json` / `GoogleService-Info.plist` (gitignored — see root `.gitignore`).
- iOS: camera/notification usage descriptions must be added to `Info.plist` (see `docs/ENVIRONMENT.md`).

**Do not add here:** notification-tap handling, scan-result routing, or any other business reaction to an event — that belongs in the consuming feature's `domain`/`presentation` layer.
