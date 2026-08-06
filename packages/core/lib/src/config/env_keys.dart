/// Canonical `.env` key names. Centralizing these avoids typo'd string keys
/// scattered across the codebase and gives us one place to update when a
/// new environment variable is introduced.
abstract final class EnvKeys {
  static const String apiBaseUrl = 'API_BASE_URL';
  static const String wsBaseUrl = 'WS_BASE_URL';
  static const String appName = 'APP_NAME';
  static const String enableLogging = 'ENABLE_LOGGING';
  static const String sentryDsn = 'SENTRY_DSN';
  static const String firebaseProjectId = 'FIREBASE_PROJECT_ID';
  static const String apiTimeoutSeconds = 'API_TIMEOUT_SECONDS';
}
