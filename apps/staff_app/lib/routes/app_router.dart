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
    initialLocation: StaffRoutes.today,
    redirect: (context, state) {
      if (init.isLoading) return null;
      final isAuth = auth.isAuthenticated;
      final isLogin = state.matchedLocation == StaffRoutes.login ||
          state.matchedLocation == StaffRoutes.forgotPassword;
      if (!isAuth && !isLogin) return StaffRoutes.login;
      if (isAuth && isLogin) return StaffRoutes.today;
      return null;
    },
    routes: [
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
