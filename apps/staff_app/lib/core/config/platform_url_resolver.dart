import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:queueflow_shared/queueflow_shared.dart';

/// Adjusts API / WebSocket base URLs for the current platform.
///
/// - **Android emulator:** `localhost` → `10.0.2.2` (host loopback)
/// - **Web / iOS simulator / Windows / macOS:** uses `.env` values as-is
///
/// For a physical Android device, set `API_BASE_URL` / `WS_BASE_URL` to your
/// machine's LAN IP in a local override file.
abstract final class PlatformUrlResolver {
  static AppConfig apply(AppConfig config) {
    if (kIsWeb || !Platform.isAndroid) return config;

    return AppConfig(
      flavor: config.flavor,
      apiBaseUrl: _hostLoopback(config.apiBaseUrl),
      wsBaseUrl: _hostLoopback(config.wsBaseUrl),
      appName: config.appName,
      enableLogging: config.enableLogging,
      apiTimeoutSeconds: config.apiTimeoutSeconds,
      sentryDsn: config.sentryDsn,
      firebaseProjectId: config.firebaseProjectId,
    );
  }

  static String _hostLoopback(String url) {
    return url
        .replaceAll('localhost', '10.0.2.2')
        .replaceAll('127.0.0.1', '10.0.2.2');
  }
}
