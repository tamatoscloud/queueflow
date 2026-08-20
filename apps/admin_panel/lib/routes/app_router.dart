import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/routing/app_routes.dart';
import '../core/session/session_providers.dart';
import '../features/activity/activity_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/audit/audit_screen.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/branches/branches_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/feature_flags/feature_flags_screen.dart';
import '../features/health/health_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/shell/admin_shell.dart';
import '../features/subscriptions/subscriptions_screen.dart';
import '../features/support/support_screen.dart';
import '../features/tenants/tenants_screen.dart';
import '../features/users/users_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final init = ref.watch(sessionInitProvider);

  return GoRouter(
    initialLocation: AppRoutes.boot,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final isLogin = loc == AppRoutes.login;
      final isBoot = loc == AppRoutes.boot;
      if (init.isLoading) {
        return isBoot || isLogin ? null : AppRoutes.boot;
      }
      final isAuth = auth.isAuthenticated;
      if (!isAuth && !isLogin) return AppRoutes.login;
      if (isAuth && (isLogin || isBoot)) return AppRoutes.dashboard;
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.boot, builder: (_, __) => const SessionLoadingScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: AppRoutes.dashboard, builder: (_, __) => const DashboardScreen()),
          GoRoute(path: AppRoutes.tenants, builder: (_, __) => const TenantsScreen()),
          GoRoute(path: AppRoutes.branches, builder: (_, __) => const BranchesScreen()),
          GoRoute(path: AppRoutes.users, builder: (_, __) => const UsersScreen()),
          GoRoute(path: AppRoutes.subscriptions, builder: (_, __) => const SubscriptionsScreen()),
          GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: AppRoutes.audit, builder: (_, __) => const AuditScreen()),
          GoRoute(path: AppRoutes.activity, builder: (_, __) => const ActivityScreen()),
          GoRoute(path: AppRoutes.support, builder: (_, __) => const SupportScreen()),
          GoRoute(path: AppRoutes.featureFlags, builder: (_, __) => const FeatureFlagsScreen()),
          GoRoute(path: AppRoutes.health, builder: (_, __) => const HealthScreen()),
          GoRoute(path: AppRoutes.analytics, builder: (_, __) => const AnalyticsScreen()),
          GoRoute(path: AppRoutes.settings, builder: (_, __) => const SettingsScreen()),
        ],
      ),
      GoRoute(
        path: '/tenants/:id',
        builder: (_, state) => TenantDetailScreen(businessId: state.pathParameters['id']!),
      ),
    ],
  );
});

/// Shown while session bootstrap runs.
class SessionLoadingScreen extends StatelessWidget {
  const SessionLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
