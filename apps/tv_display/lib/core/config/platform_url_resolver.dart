import 'package:queueflow_shared/queueflow_shared.dart';

/// Adjusts API / WebSocket base URLs for the current platform.
abstract final class PlatformUrlResolver {
  static AppConfig apply(AppConfig config) => config;
}
