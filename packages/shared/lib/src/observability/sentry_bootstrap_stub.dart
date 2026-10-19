import 'package:queueflow_core/queueflow_core.dart';

/// Web entry. Sentry is not linked into the browser bundle.
Future<void> runWithObservability({
  required AppConfig config,
  required Future<void> Function() appRunner,
}) {
  return appRunner();
}
