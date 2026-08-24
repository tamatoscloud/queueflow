/// Application route paths for GoRouter.
abstract final class AppRoutes {
  static const login = '/login';
  static const forgotPassword = '/forgot-password';
  static const boot = '/boot';
  static const shell = '/';
  static const dashboard = '/dashboard';
  static const staffToday = '/today';
  static const branches = '/branches';
  static const branchAdd = '/branches/add';
  static String branchEdit(String id) => '/branches/$id/edit';
  static const queues = '/queues';
  static String queueDetail(String id) => '/queues/$id';
  static String queueConsole(String id) => '/queues/$id/console';
  static String queueSettings(String id) => '/queues/$id/settings';
  static const customers = '/customers';
  static String customerDetail(String id) => '/customers/$id';
  static const reviews = '/reviews';
  static const reports = '/reports';
  static const settings = '/settings';
  static const staff = '/staff';
  static const notifications = '/notifications';
  static const restaurantQr = '/restaurant/qr';
  static const restaurantSimulator = '/restaurant/simulator';
  static const restaurantTables = '/restaurant/tables';
}
