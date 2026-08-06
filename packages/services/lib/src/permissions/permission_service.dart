import 'package:permission_handler/permission_handler.dart';

/// Generic runtime-permission requests. Feature code asks
/// `permissionService.request(AppPermission.camera)` instead of importing
/// `permission_handler` directly, keeping the plugin swappable.
enum AppPermission { camera, notifications, location }

abstract interface class PermissionService {
  Future<bool> isGranted(AppPermission permission);

  Future<bool> request(AppPermission permission);
}

final class RuntimePermissionService implements PermissionService {
  Permission _map(AppPermission permission) => switch (permission) {
    AppPermission.camera => Permission.camera,
    AppPermission.notifications => Permission.notification,
    AppPermission.location => Permission.location,
  };

  @override
  Future<bool> isGranted(AppPermission permission) async {
    return _map(permission).isGranted;
  }

  @override
  Future<bool> request(AppPermission permission) async {
    final status = await _map(permission).request();
    return status.isGranted;
  }
}
