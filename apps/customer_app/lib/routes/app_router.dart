import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

/// Root router. Only a bootstrap-verification placeholder route is
/// registered here — real feature routes are added by each
/// `features/<feature>/routes/` module and merged in as those features are
/// implemented. Kept as a Riverpod provider (not a top-level const) so it
/// can later read auth state to decide redirects.
final Provider<GoRouter> goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: SharedRoutePaths.root,
    routes: [
      GoRoute(
        path: SharedRoutePaths.root,
        builder: (context, state) => const _BootstrapVerificationScreen(),
      ),
    ],
  );
});

/// Not a product feature/screen — exists only so the scaffold is runnable
/// and visibly proves the env → DI → router → theme pipeline works end to
/// end. Delete once the first real feature route replaces it.
class _BootstrapVerificationScreen extends ConsumerWidget {
  const _BootstrapVerificationScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appConfig = ref.watch(appConfigProvider);

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                appConfig.appName,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text('Flavor: ${appConfig.flavor.label}'),
              Text('API base URL: ${appConfig.apiBaseUrl}'),
            ],
          ),
        ),
      ),
    );
  }
}
