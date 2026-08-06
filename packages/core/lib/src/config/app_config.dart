import 'package:meta/meta.dart';

import 'env_keys.dart';
import 'flavor.dart';

/// Thrown when a required environment variable is missing or malformed.
/// Deliberately fatal — we never want to silently fall back to a wrong
/// value for something as sensitive as `API_BASE_URL` in production.
final class EnvironmentConfigException implements Exception {
  const EnvironmentConfigException(this.message);

  final String message;

  @override
  String toString() => 'EnvironmentConfigException: $message';
}

/// Strongly-typed, immutable snapshot of the current environment.
///
/// This class never reads files or platform channels itself — the app
/// layer loads the right `.env.*` file (via `flutter_dotenv`) into a
/// `Map<String, String>` and hands it to [AppConfig.fromEnvMap]. That keeps
/// this package pure Dart and trivially testable.
@immutable
final class AppConfig {
  const AppConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.wsBaseUrl,
    required this.appName,
    required this.enableLogging,
    required this.apiTimeoutSeconds,
    this.sentryDsn,
    this.firebaseProjectId,
  });

  final Flavor flavor;
  final String apiBaseUrl;
  final String wsBaseUrl;
  final String appName;
  final bool enableLogging;
  final int apiTimeoutSeconds;
  final String? sentryDsn;
  final String? firebaseProjectId;

  static AppConfig fromEnvMap(Map<String, String> env, Flavor flavor) {
    return AppConfig(
      flavor: flavor,
      apiBaseUrl: _requireString(env, EnvKeys.apiBaseUrl),
      wsBaseUrl: _requireString(env, EnvKeys.wsBaseUrl),
      appName: _requireString(env, EnvKeys.appName),
      enableLogging: _optionalBool(
        env,
        EnvKeys.enableLogging,
        fallback: !flavor.isProduction,
      ),
      apiTimeoutSeconds: _optionalInt(
        env,
        EnvKeys.apiTimeoutSeconds,
        fallback: 30,
      ),
      sentryDsn: env[EnvKeys.sentryDsn]?.orNullIfBlank,
      firebaseProjectId: env[EnvKeys.firebaseProjectId]?.orNullIfBlank,
    );
  }

  static String _requireString(Map<String, String> env, String key) {
    final value = env[key];
    if (value == null || value.trim().isEmpty) {
      throw EnvironmentConfigException(
        'Missing required environment variable "$key". '
        'Check the .env file for this flavor.',
      );
    }
    return value;
  }

  static bool _optionalBool(
    Map<String, String> env,
    String key, {
    required bool fallback,
  }) {
    final value = env[key];
    if (value == null || value.trim().isEmpty) return fallback;
    return switch (value.toLowerCase()) {
      'true' || '1' => true,
      'false' || '0' => false,
      _ => throw EnvironmentConfigException(
        'Environment variable "$key" must be a boolean (true/false), got "$value".',
      ),
    };
  }

  static int _optionalInt(
    Map<String, String> env,
    String key, {
    required int fallback,
  }) {
    final value = env[key];
    if (value == null || value.trim().isEmpty) return fallback;
    final parsed = int.tryParse(value);
    if (parsed == null) {
      throw EnvironmentConfigException(
        'Environment variable "$key" must be an integer, got "$value".',
      );
    }
    return parsed;
  }

  @override
  String toString() =>
      'AppConfig(flavor: ${flavor.name}, appName: $appName, apiBaseUrl: $apiBaseUrl)';
}

extension _NullIfBlank on String {
  String? get orNullIfBlank => trim().isEmpty ? null : this;
}
