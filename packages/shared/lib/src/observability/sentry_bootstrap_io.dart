import 'package:flutter/widgets.dart';
import 'package:queueflow_core/queueflow_core.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// Mobile and desktop. Web uses [sentry_bootstrap_stub.dart] so the browser
/// bundle does not include the Sentry SDK.
Future<void> runWithObservability({
  required AppConfig config,
  required Future<void> Function() appRunner,
}) async {
  final dsn = config.sentryDsn;
  if (dsn == null || dsn.isEmpty) {
    await appRunner();
    return;
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = dsn;
      options.environment = config.flavor.name;
      options.tracesSampleRate = config.flavor.isProduction ? 0.1 : 1.0;
      options.captureFailedRequests = true;
    },
    appRunner: () async {
      FlutterError.onError = (details) {
        Sentry.captureException(details.exception, stackTrace: details.stack);
      };
      await appRunner();
    },
  );
}
