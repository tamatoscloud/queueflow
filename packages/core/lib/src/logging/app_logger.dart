import 'package:riverpod/riverpod.dart';

/// Logging contract, so features never call `print`/`debugPrint` directly
/// and swapping in Sentry/Crashlytics later is a one-file change.
abstract interface class AppLogger {
  void debug(String message, {Object? data});

  void info(String message, {Object? data});

  void warning(String message, {Object? data});

  void error(String message, {Object? error, StackTrace? stackTrace});
}

/// Minimal stdout implementation, sufficient for local development. Apps
/// override [appLoggerProvider] with a production-grade sink (e.g. Sentry)
/// when `AppConfig.flavor.isProduction` is true.
final class ConsoleAppLogger implements AppLogger {
  const ConsoleAppLogger({this.enabled = true});

  final bool enabled;

  @override
  void debug(String message, {Object? data}) => _log('DEBUG', message, data);

  @override
  void info(String message, {Object? data}) => _log('INFO', message, data);

  @override
  void warning(String message, {Object? data}) => _log('WARN', message, data);

  @override
  void error(String message, {Object? error, StackTrace? stackTrace}) {
    if (!enabled) return;
    // ignore: avoid_print
    print('[ERROR] $message${error != null ? ' | $error' : ''}');
    if (stackTrace != null) {
      // ignore: avoid_print
      print(stackTrace);
    }
  }

  void _log(String level, String message, Object? data) {
    if (!enabled) return;
    // ignore: avoid_print
    print('[$level] $message${data != null ? ' | $data' : ''}');
  }
}

final Provider<AppLogger> appLoggerProvider = Provider<AppLogger>(
  (ref) => const ConsoleAppLogger(),
  name: 'appLoggerProvider',
);
