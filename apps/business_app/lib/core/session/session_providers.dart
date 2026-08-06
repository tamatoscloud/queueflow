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
  await ref.read(authControllerProvider.notifier).bootstrap();
  final branchId = await ref.read(sessionBootstrapProvider).loadBranchId();
  if (branchId != null) {
    ref.read(selectedBranchIdProvider.notifier).state = branchId;
  }
});
