import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'core/storage/display_config_storage.dart';
import 'routes/app_router.dart';

class TvDisplayApp extends ConsumerWidget {
  const TvDisplayApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final config = ref.watch(displayConfigProvider).valueOrNull;
    final themeMode = config?.darkMode != false ? ThemeMode.dark : ThemeMode.light;
    final seed = config?.primaryColorValue != null
        ? Color(config!.primaryColorValue!)
        : AppColors.primary;

    final darkTheme = AppTheme.dark.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: seed,
        brightness: Brightness.dark,
        surface: AppColors.darkSurface,
        onSurface: AppColors.darkOnSurface,
      ),
      scaffoldBackgroundColor: AppColors.darkBackground,
      textTheme: _tvTextScale(AppTypography.textTheme(
        AppColors.darkOnSurface,
        muted: AppColors.darkOnSurfaceMuted,
      )),
    );

    final lightTheme = AppTheme.light.copyWith(
      colorScheme: ColorScheme.fromSeed(seedColor: seed),
      textTheme: _tvTextScale(AppTypography.textTheme(
        AppColors.lightOnSurface,
        muted: AppColors.lightOnSurfaceMuted,
      )),
    );

    return MaterialApp.router(
      title: 'QueueFlow TV',
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

/// Slightly larger base type scale for TV viewing distance.
TextTheme _tvTextScale(TextTheme base) {
  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(fontSize: 44),
    displayMedium: base.displayMedium?.copyWith(fontSize: 38),
    displaySmall: base.displaySmall?.copyWith(fontSize: 34),
    headlineLarge: base.headlineLarge?.copyWith(fontSize: 30),
    headlineMedium: base.headlineMedium?.copyWith(fontSize: 26),
    headlineSmall: base.headlineSmall?.copyWith(fontSize: 22),
    titleLarge: base.titleLarge?.copyWith(fontSize: 22),
    titleMedium: base.titleMedium?.copyWith(fontSize: 18),
    bodyLarge: base.bodyLarge?.copyWith(fontSize: 18),
    bodyMedium: base.bodyMedium?.copyWith(fontSize: 16),
  );
}
