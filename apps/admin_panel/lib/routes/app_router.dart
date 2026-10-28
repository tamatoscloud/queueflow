import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../core/routing/app_routes.dart';
import '../core/session/session_providers.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/audit/audit_screen.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/branches/branches_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/feature_flags/feature_flags_screen.dart';
import '../features/health/health_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/reviews/reviews_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/shell/admin_shell.dart';
import '../features/subscriptions/subscriptions_screen.dart';
import '../features/support/support_screen.dart';
import '../features/tenants/tenants_screen.dart';
import '../features/users/users_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  // One router for the app's lifetime; auth / boot changes re-run redirect.
  final refresh = ValueNotifier<int>(0);
  ref
    ..listen(authControllerProvider, (_, __) => refresh.value++)
    ..listen(sessionInitProvider, (_, __) => refresh.value++)
    ..onDispose(refresh.dispose);

  String? pendingDeepLink;

  return GoRouter(
    initialLocation: AppRoutes.boot,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final init = ref.read(sessionInitProvider);
      final loc = state.matchedLocation;
      final isLogin = loc == AppRoutes.login;
      final isBoot = loc == AppRoutes.boot;
      if (init.isLoading) {
        if (!isBoot && !isLogin) pendingDeepLink = state.uri.toString();
        return isBoot || isLogin ? null : AppRoutes.boot;
      }
      if (!auth.isAuthenticated) {
        if (!isLogin && !isBoot) pendingDeepLink = state.uri.toString();
        return isLogin ? null : AppRoutes.login;
      }
      if (isLogin || isBoot) {
        final target = pendingDeepLink;
        pendingDeepLink = null;
        return target ?? AppRoutes.dashboard;
      }
      return null;
    },
    errorBuilder: (context, state) => const _NotFoundScreen(),
    routes: [
      GoRoute(path: AppRoutes.boot, builder: (_, __) => const SessionLoadingScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: AppRoutes.dashboard, builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: AppRoutes.tenants,
            builder: (_, __) => const TenantsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => TenantDetailScreen(businessId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: AppRoutes.branches, builder: (_, __) => const BranchesScreen()),
          GoRoute(path: AppRoutes.users, builder: (_, __) => const UsersScreen()),
          GoRoute(path: AppRoutes.subscriptions, builder: (_, __) => const SubscriptionsScreen()),
          GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: AppRoutes.reviews, builder: (_, __) => const ReviewsScreen()),
          GoRoute(path: AppRoutes.audit, builder: (_, __) => const AuditScreen()),
          // Activity showed the same audit data; keep old links working.
          GoRoute(path: AppRoutes.activity, redirect: (_, __) => AppRoutes.audit),
          GoRoute(path: AppRoutes.support, builder: (_, __) => const SupportScreen()),
          GoRoute(path: AppRoutes.featureFlags, builder: (_, __) => const FeatureFlagsScreen()),
          GoRoute(path: AppRoutes.health, builder: (_, __) => const HealthScreen()),
          GoRoute(path: AppRoutes.analytics, builder: (_, __) => const AnalyticsScreen()),
          GoRoute(path: AppRoutes.settings, builder: (_, __) => const SettingsScreen()),
        ],
      ),
    ],
  );
});

/// Shown while session bootstrap runs.
class SessionLoadingScreen extends StatelessWidget {
  const SessionLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: QuykColors.cream,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            QuykLogoTile(size: 56),
            SizedBox(height: 20),
            SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2.6)),
          ],
        ),
      ),
    );
  }
}

class _NotFoundScreen extends StatelessWidget {
  const _NotFoundScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QuykColors.cream,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const QuykIconBubble(icon: Icons.explore_off_outlined, size: 56),
            const SizedBox(height: 16),
            const Text(
              "This page doesn't exist",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: QuykColors.green),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => context.go(AppRoutes.dashboard),
              child: const Text('Go to overview'),
            ),
          ],
        ),
      ),
    );
  }
}
