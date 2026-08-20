/// Staff app route paths.
abstract final class StaffRoutes {
  static const login = '/login';
  static const forgotPassword = '/forgot-password';
  static const boot = '/boot';
  static const today = '/';
  static const customers = '/customers';
  static const notifications = '/notifications';
  static const profile = '/profile';
  static const settings = '/settings';
  static String queueConsole(String id) => '/queues/$id/console';
  static String customerDetail(String id) => '/customers/$id';
}
