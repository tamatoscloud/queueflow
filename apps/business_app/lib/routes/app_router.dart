import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/persona/user_persona.dart';
import '../../core/routing/app_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/branches/presentation/branches_screen.dart';
import '../../features/customers/presentation/customers_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/menu/presentation/menu_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/queue_console/presentation/queue_console_screen.dart';
import '../../features/queues/presentation/queues_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/restaurant_demo/presentation/demo_simulator_screen.dart';
import '../../features/restaurant_demo/presentation/qr_center_screen.dart';
import '../../features/restaurant_demo/presentation/table_floor_screen.dart';
import '../../features/reviews/presentation/reviews_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/shell/presentation/business_shell.dart';
import '../../features/staff/presentation/staff_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  // Rebuilding the GoRouter on every auth change resets navigation; instead
  // keep one router and re-run its redirect when auth / boot state changes.
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
      final isLogin = loc == AppRoutes.login || loc == AppRoutes.forgotPassword;
      final isBoot = loc == AppRoutes.boot;
      if (init.isLoading) {
        if (!isBoot && !isLogin) pendingDeepLink = state.uri.toString();
        return isBoot || isLogin ? null : AppRoutes.boot;
      }
      final isAuth = auth.isAuthenticated;
      if (!isAuth && !isLogin) {
        if (!isBoot) pendingDeepLink = state.uri.toString();
        return AppRoutes.login;
      }
      final user = auth.session?.user;
      final persona = personaFromUser(user);
      if (isAuth && (isLogin || isBoot)) {
        final target = pendingDeepLink;
        pendingDeepLink = null;
        if (target != null && userCanAccessPath(user, Uri.parse(target).path)) return target;
        return defaultRouteForPersona(persona);
      }
      if (isAuth) {
        if (!userCanAccessPath(user, loc)) return defaultRouteForPersona(persona);
        if (persona == BusinessPersona.staff && loc == AppRoutes.dashboard) {
          return AppRoutes.queues;
        }
        if (!kDebugMode &&
            (loc.startsWith(AppRoutes.restaurantSimulator) ||
                loc.startsWith(AppRoutes.restaurantTables))) {
          return defaultRouteForPersona(persona);
        }
      }
      return null;
    },
    errorBuilder: (context, state) => const _NotFoundScreen(),
    routes: [
      GoRoute(path: AppRoutes.boot, builder: (_, __) => const _SessionBootScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: AppRoutes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      ShellRoute(
        builder: (context, state, child) => BusinessShell(child: child),
        routes: [
          GoRoute(path: AppRoutes.dashboard, builder: (_, __) => const DashboardScreen()),
          GoRoute(path: AppRoutes.staffToday, redirect: (_, __) => AppRoutes.queues),
          GoRoute(
            path: AppRoutes.queues,
            builder: (_, __) => const QueuesScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => QueueDetailScreen(queueId: state.pathParameters['id']!),
                routes: [
                  GoRoute(
                    path: 'console',
                    builder: (_, state) => QueueConsoleScreen(queueId: state.pathParameters['id']!),
                  ),
                  GoRoute(
                    path: 'settings',
                    builder: (_, state) => QueueSettingsScreen(queueId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.branches,
            builder: (_, __) => const BranchesScreen(),
            routes: [
              GoRoute(path: 'add', builder: (_, __) => const BranchFormScreen()),
              GoRoute(
                path: ':id/edit',
                builder: (_, state) => BranchFormScreen(branchId: state.pathParameters['id']),
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.customers,
            builder: (_, __) => const CustomersScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => CustomerDetailScreen(customerId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: AppRoutes.reviews, builder: (_, __) => const ReviewsScreen()),
          GoRoute(path: AppRoutes.reports, builder: (_, __) => const ReportsScreen()),
          GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: AppRoutes.settings, builder: (_, __) => const SettingsScreen()),
          GoRoute(path: AppRoutes.staff, builder: (_, __) => const StaffScreen()),
          GoRoute(path: AppRoutes.restaurantQr, builder: (_, __) => const QrCenterScreen()),
          GoRoute(path: AppRoutes.menu, builder: (_, __) => const MenuScreen()),
          GoRoute(path: AppRoutes.restaurantSimulator, builder: (_, __) => const DemoSimulatorScreen()),
          GoRoute(path: AppRoutes.restaurantTables, builder: (_, __) => const TableFloorScreen()),
        ],
      ),
    ],
  );
});

class _SessionBootScreen extends StatelessWidget {
  const _SessionBootScreen();

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
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const QuykIconBubble(icon: Icons.explore_off_outlined, size: 56),
              const SizedBox(height: 16),
              const Text(
                "This page doesn't exist",
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: QuykColors.green),
              ),
              const SizedBox(height: 6),
              const Text(
                'The link may be old or mistyped.',
                style: TextStyle(fontSize: 14, color: QuykColors.muted),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => context.go(AppRoutes.dashboard),
                child: const Text('Go to home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
