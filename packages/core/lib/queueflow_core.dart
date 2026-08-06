/// Cross-cutting application core shared by every QueueFlow app.
///
/// Pure Dart — no `package:flutter` dependency — so it stays portable to a
/// future Dart backend. Flutter-specific plumbing (loading `.env` files as
/// assets, etc.) lives in the app layer and feeds this package plain data.
library;

export 'src/config/app_config.dart';
export 'src/config/env_keys.dart';
export 'src/config/flavor.dart';
export 'src/config/providers.dart';
export 'src/error/failure.dart';
export 'src/logging/app_logger.dart';
export 'src/result/result.dart';
