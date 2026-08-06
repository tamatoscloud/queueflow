import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/storage/display_config_storage.dart';
import '../features/display/presentation/display_screen.dart';
import '../features/setup/presentation/setup_screens.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final configAsync = ref.watch(displayConfigProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final path = state.matchedLocation;
      final config = configAsync.valueOrNull;
      final isLoading = configAsync.isLoading;

      if (isLoading) return null;

      final setupPaths = {'/pair', '/setup', '/setup/configure'};
      if (config != null && setupPaths.contains(path)) {
        return '/display';
      }
      if (config == null && path == '/display') {
        return '/pair';
      }
      if (path == '/') {
        return config != null ? '/display' : '/pair';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/pair', builder: (_, __) => const PublicPairScreen()),
      GoRoute(path: '/setup', builder: (_, __) => const StaffLoginScreen()),
      GoRoute(
        path: '/setup/configure',
        builder: (_, __) => const StaffConfigureScreen(),
      ),
      GoRoute(path: '/display', builder: (_, __) => const DisplayScreen()),
    ],
  );
});
