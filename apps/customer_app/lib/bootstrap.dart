import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import 'app.dart';

/// Single bootstrap entrypoint shared by every flavor's `main_<flavor>.dart`.
/// Loads the flavor's `.env.*` file, builds the strongly-typed [AppConfig],
/// and overrides every provider that has no default (env, Dio, storage)
/// before running the app. This is the app's composition root.
Future<void> bootstrap(Flavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: flavor.envFileName);
  final appConfig = AppConfig.fromEnvMap(dotenv.env, flavor);

  final storageService = HiveStorageService(boxName: 'customer_app_storage');
  await storageService.init();

  final dio = const DioClientFactory().create(
    baseUrl: appConfig.apiBaseUrl,
    connectTimeout: Duration(seconds: appConfig.apiTimeoutSeconds),
    receiveTimeout: Duration(seconds: appConfig.apiTimeoutSeconds),
    enableLogging: appConfig.enableLogging,
  );

  runApp(
    ProviderScope(
      overrides: [
        flavorProvider.overrideWithValue(flavor),
        appConfigProvider.overrideWithValue(appConfig),
        dioProvider.overrideWithValue(dio),
        storageServiceProvider.overrideWithValue(storageService),
      ],
      child: const CustomerApp(),
    ),
  );
}
