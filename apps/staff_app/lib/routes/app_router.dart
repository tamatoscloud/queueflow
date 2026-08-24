import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/routing/staff_routes.dart';
import '../core/session/session_providers.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/customers/presentation/customers_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/queue_console/presentation/queue_console_screen.dart';
import '../features/shell/staff_shell.dart';
import '../features/today/today_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final init = ref.watch(sessionInitProvider);

  return GoRouter(
    initialLocation: StaffRoutes.login,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final isLogin = loc == StaffRoutes.login || loc == StaffRoutes.forgotPassword;
      final isBoot = loc == StaffRoutes.boot;
      // Show login immediately while session restore runs — never park on /boot
      // for cold visitors who have no tokens.
      if (init.isLoading) {
        if (isLogin || isBoot) return null;
        return StaffRoutes.login;
      }
      final isAuth = auth.isAuthenticated;
      if (!isAuth && !isLogin) return StaffRoutes.login;
      if (isAuth && (isLogin || isBoot)) return StaffRoutes.today;
      return null;
    },
    routes: [
      GoRoute(path: StaffRoutes.boot, builder: (_, __) => const _SessionBootScreen()),
      GoRoute(path: StaffRoutes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: StaffRoutes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      ShellRoute(
        builder: (_, __, child) => StaffShell(child: child),
        routes: [
          GoRoute(path: StaffRoutes.today, builder: (_, __) => const TodayScreen()),
          GoRoute(path: StaffRoutes.customers, builder: (_, __) => const CustomersScreen()),
          GoRoute(path: StaffRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: StaffRoutes.profile, builder: (_, __) => const ProfileScreen()),
        ],
      ),
      GoRoute(
        path: '/queues/:id/console',
        builder: (_, state) => QueueConsoleScreen(queueId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/customers/:id',
        builder: (_, state) => CustomerDetailScreen(customerId: state.pathParameters['id']!),
      ),
    ],
  );
});

class _SessionBootScreen extends StatelessWidget {
  const _SessionBootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
