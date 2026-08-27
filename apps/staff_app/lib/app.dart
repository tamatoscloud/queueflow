import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'routes/app_router.dart';

class StaffApp extends ConsumerWidget {
  const StaffApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'QueueFlow Staff',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light.copyWith(
        scaffoldBackgroundColor: AppColors.calmIvory,
        extensions: [
          ...AppTheme.light.extensions.values,
          const ProductTheme(identity: ProductIdentity.staff),
        ],
      ),
      darkTheme: AppTheme.dark.copyWith(
        extensions: [
          ...AppTheme.dark.extensions.values,
          const ProductTheme(identity: ProductIdentity.staff),
        ],
      ),
      themeMode: ThemeMode.light,
      routerConfig: router,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en')],
    );
  }
}
