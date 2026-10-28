import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_shared/queueflow_shared.dart';

import 'core/session/session_providers.dart';
import 'routes/app_router.dart';

class AdminPanelApp extends ConsumerWidget {
  const AdminPanelApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appConfig = ref.watch(appConfigProvider);
    final router = ref.watch(goRouterProvider);
    final init = ref.watch(sessionInitProvider);

    if (init.isLoading) {
      return MaterialApp(
        title: appConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: buildQuykTheme(identity: ProductIdentity.platformAdmin),
        home: const SessionLoadingScreen(),
      );
    }

    return MaterialApp.router(
      title: appConfig.appName,
      debugShowCheckedModeBanner: !appConfig.flavor.isProduction,
      theme: buildQuykTheme(identity: ProductIdentity.platformAdmin),
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
