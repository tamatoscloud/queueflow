abstract final class AppRoutes {
  static const login = '/login';
  static const boot = '/boot';
  static const dashboard = '/dashboard';
  static const tenants = '/tenants';
  static const branches = '/branches';
  static const users = '/users';
  static const subscriptions = '/subscriptions';
  static const notifications = '/notifications';
  static const reviews = '/reviews';
  static const audit = '/audit';
  static const activity = '/activity';
  static const support = '/support';
  static const featureFlags = '/feature-flags';
  static const health = '/health';
  static const analytics = '/analytics';
  static const settings = '/settings';

  static String tenantDetail(String id) => '/tenants/$id';
}
