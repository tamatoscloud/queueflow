import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import 'app.dart';

/// Same composition-root pattern as `customer_app`/`business_app`, minus
/// mobile-only services (Hive/FCM/scanner/permissions) this web app doesn't
/// depend on.
Future<void> bootstrap(Flavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();
  // Keep the address bar in sync with pushed pages so refresh/share work.
  GoRouter.optionURLReflectsImperativeAPIs = true;

  await dotenv.load(fileName: flavor.envFileName);
  final appConfig = AppConfig.fromEnvMap(dotenv.env, flavor);

  final dio = const DioClientFactory().create(
    baseUrl: appConfig.apiBaseUrl,
    connectTimeout: Duration(seconds: appConfig.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: appConfig.apiTimeoutSeconds),
    enableLogging: appConfig.enableLogging,
  );

  await runWithObservability(
    config: appConfig,
    appRunner: () async {
      runApp(
        ProviderScope(
          overrides: [
            flavorProvider.overrideWithValue(flavor),
            appConfigProvider.overrideWithValue(appConfig),
            dioProvider.overrideWithValue(dio),
          ],
          child: const AdminPanelApp(),
        ),
      );
    },
  );
}
