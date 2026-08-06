import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/persona/user_persona.dart';
import '../../core/routing/app_routes.dart';
import '../../core/session/session_providers.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/branches/presentation/branches_screen.dart';
import '../../features/customers/presentation/customers_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/queue_console/presentation/queue_console_screen.dart';
import '../../features/queues/presentation/queues_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/restaurant_demo/presentation/demo_simulator_screen.dart';
import '../../features/restaurant_demo/presentation/qr_center_screen.dart';
import '../../features/restaurant_demo/presentation/table_floor_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/shell/presentation/app_shell_resolver.dart';
import '../../features/staff/presentation/staff_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final init = ref.watch(sessionInitProvider);

  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    redirect: (context, state) {
      if (init.isLoading) return null;
      final isAuth = auth.isAuthenticated;
      final isLogin = state.matchedLocation == AppRoutes.login ||
          state.matchedLocation == AppRoutes.forgotPassword;
      if (!isAuth && !isLogin) return AppRoutes.login;
      if (isAuth && isLogin) {
        return defaultRouteForPersona(personaFromUser(auth.session?.user));
      }
      if (isAuth) {
        final user = auth.session?.user;
        final persona = personaFromUser(user);
        if (!userCanAccessPath(user, state.matchedLocation)) {
          return defaultRouteForPersona(persona);
        }
        if (persona == BusinessPersona.staff &&
            state.matchedLocation == AppRoutes.dashboard) {
          return AppRoutes.queues;
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: AppRoutes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShellResolver(child: child),
        routes: [
          GoRoute(path: AppRoutes.dashboard, builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: AppRoutes.staffToday,
            redirect: (_, __) => AppRoutes.queues,
          ),
          GoRoute(path: AppRoutes.queues, builder: (_, __) => const QueuesScreen()),
          GoRoute(path: AppRoutes.branches, builder: (_, __) => const BranchesScreen()),
          GoRoute(path: AppRoutes.customers, builder: (_, __) => const CustomersScreen()),
          GoRoute(path: AppRoutes.reports, builder: (_, __) => const ReportsScreen()),
          GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: AppRoutes.settings, builder: (_, __) => const SettingsScreen()),
          GoRoute(path: AppRoutes.staff, builder: (_, __) => const StaffScreen()),
          GoRoute(path: AppRoutes.restaurantQr, builder: (_, __) => const QrCenterScreen()),
          GoRoute(path: AppRoutes.restaurantSimulator, builder: (_, __) => const DemoSimulatorScreen()),
          GoRoute(path: AppRoutes.restaurantTables, builder: (_, __) => const TableFloorScreen()),
        ],
      ),
      GoRoute(
        path: '/queues/:id',
        builder: (_, state) => QueueDetailScreen(queueId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/queues/:id/console',
        builder: (_, state) => QueueConsoleScreen(queueId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/queues/:id/settings',
        builder: (_, state) => QueueSettingsScreen(queueId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/branches/add',
        builder: (_, __) => const BranchFormScreen(),
      ),
      GoRoute(
        path: '/branches/:id/edit',
        builder: (_, state) => BranchFormScreen(branchId: state.pathParameters['id']),
      ),
      GoRoute(
        path: '/customers/:id',
        builder: (_, state) => CustomerDetailScreen(customerId: state.pathParameters['id']!),
      ),
    ],
  );
});
