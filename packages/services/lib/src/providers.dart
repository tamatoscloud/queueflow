import 'package:riverpod/riverpod.dart';

import 'notifications/notification_service.dart';
import 'permissions/permission_service.dart';
import 'scanner/scanner_service.dart';
import 'storage/secure_storage_service.dart';
import 'storage/storage_service.dart';

/// Concrete implementations wired here; overridable per-app or per-test.
/// This is the seam that makes `queueflow_services` DI-ready: nothing in a
/// feature module ever instantiates `HiveStorageService()` etc. directly.

final Provider<StorageService> storageServiceProvider =
    Provider<StorageService>(
      (ref) => HiveStorageService(),
      name: 'storageServiceProvider',
    );

final Provider<SecureStorageService> secureStorageServiceProvider =
    Provider<SecureStorageService>(
      (ref) => FlutterSecureStorageService(),
      name: 'secureStorageServiceProvider',
    );

final Provider<NotificationService> notificationServiceProvider =
    Provider<NotificationService>(
      (ref) => FirebaseNotificationService(),
      name: 'notificationServiceProvider',
    );

final Provider<ScannerService> scannerServiceProvider =
    Provider<ScannerService>(
      (ref) => MobileScannerService(),
      name: 'scannerServiceProvider',
    );

final Provider<PermissionService> permissionServiceProvider =
    Provider<PermissionService>(
      (ref) => RuntimePermissionService(),
      name: 'permissionServiceProvider',
    );
