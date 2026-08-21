import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_services/queueflow_services.dart';

import '../../features/auth/presentation/auth_controller.dart';

/// Currently selected branch for filtering queues and console.
final selectedBranchIdProvider = StateProvider<String?>((ref) => null);

class SessionBootstrap {
  SessionBootstrap(this._storage);

  final StorageService _storage;
  static const _branchKey = 'selected_branch_id';

  Future<String?> loadBranchId() async => _storage.get<String>(_branchKey);

  Future<void> saveBranchId(String? id) async {
    if (id == null) {
      await _storage.delete(_branchKey);
    } else {
      await _storage.put(_branchKey, id);
    }
  }
}

final sessionBootstrapProvider = Provider<SessionBootstrap>((ref) {
  return SessionBootstrap(ref.watch(storageServiceProvider));
});

final sessionInitProvider = FutureProvider<void>((ref) async {
  try {
    await ref
        .read(authControllerProvider.notifier)
        .bootstrap()
        .timeout(const Duration(seconds: 8));
  } catch (_) {
    // Prefer login over an endless /boot spinner if secure storage hangs.
    final status = ref.read(authControllerProvider).status;
    if (status == AuthStatus.unknown) {
      // Force unauthenticated so router can leave /boot.
      await ref.read(authControllerProvider.notifier).sessionExpired();
    }
  }
  try {
    final branchId = await ref
        .read(sessionBootstrapProvider)
        .loadBranchId()
        .timeout(const Duration(seconds: 2));
    if (branchId != null) {
      ref.read(selectedBranchIdProvider.notifier).state = branchId;
    }
  } catch (_) {
    // Branch preference is optional.
  }
});
