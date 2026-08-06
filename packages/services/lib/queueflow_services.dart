/// Concrete infrastructure services behind narrow interfaces. Feature code
/// depends on the interfaces (`StorageService`, `NotificationService`, ...)
/// via Riverpod providers, never on Hive/FCM/etc. directly — that keeps
/// features testable and lets us swap implementations without touching them.
library;

export 'src/notifications/notification_service.dart';
export 'src/permissions/permission_service.dart';
export 'src/providers.dart';
export 'src/scanner/scanner_service.dart';
export 'src/storage/secure_storage_service.dart';
export 'src/storage/storage_service.dart';
