import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_core/queueflow_core.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'routes/app_router.dart';

class MarketingWebsiteApp extends ConsumerWidget {
  const MarketingWebsiteApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appConfig = ref.watch(appConfigProvider);
    final router = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: appConfig.appName,
      debugShowCheckedModeBanner: !appConfig.flavor.isProduction,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
