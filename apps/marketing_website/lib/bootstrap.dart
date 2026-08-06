import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_core/queueflow_core.dart';
import 'package:queueflow_network/queueflow_network.dart';

import 'app.dart';

Future<void> bootstrap(Flavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: flavor.envFileName);
  final appConfig = AppConfig.fromEnvMap(dotenv.env, flavor);

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
      ],
      child: const MarketingWebsiteApp(),
    ),
  );
}
