import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import 'app.dart';
import 'core/config/platform_url_resolver.dart';
import 'core/session/session_providers.dart';

Future<void> bootstrap(Flavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: flavor.envFileName);
  final appConfig = PlatformUrlResolver.apply(
    AppConfig.fromEnvMap(dotenv.env, flavor),
  );

  // Start Hive init without blocking first paint — session restore awaits it.
  final storageService = HiveStorageService(boxName: 'staff_app_storage');
  final storageReady = storageService.init();

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
            storageServiceProvider.overrideWithValue(storageService),
            staffStorageReadyProvider.overrideWithValue(storageReady),
          ],
          child: const StaffApp(),
        ),
      );
    },
  );
}
