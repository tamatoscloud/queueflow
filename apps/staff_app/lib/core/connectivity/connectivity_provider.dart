import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

bool connectivityResultsOnline(List<ConnectivityResult> results) {
  return results.any((r) => r != ConnectivityResult.none);
}

/// Emits current online state immediately, then follow-up changes.
///
/// On web, [Connectivity.onConnectivityChanged] alone often never fires an
/// initial event (only browser online/offline transitions), which left
/// [StreamProvider] stuck in [AsyncLoading] forever.
final connectivityProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  yield connectivityResultsOnline(await connectivity.checkConnectivity());
  yield* connectivity.onConnectivityChanged.map(connectivityResultsOnline);
});
