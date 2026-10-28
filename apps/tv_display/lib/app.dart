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
    final accent = config?.primaryColorValue != null
        ? Color(config!.primaryColorValue!)
        : QuykColors.lime;

    final darkTheme = buildTvDarkTheme(accent);
    final lightTheme = buildTvLightTheme(config?.primaryColorValue != null ? accent : null);

    return MaterialApp.router(
      title: 'Quyk TV',
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

/// Quyk TV board: deep green with lime highlights.
ThemeData buildTvDarkTheme(Color accent) {
  return buildQuykTheme(identity: ProductIdentity.tvDisplay).copyWith(
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: QuykColors.green,
      brightness: Brightness.dark,
      primary: accent,
      onPrimary: QuykColors.green,
      secondary: QuykColors.limeSoft,
      surface: QuykColors.greenPanel,
      onSurface: Colors.white,
      error: QuykColors.danger,
    ),
    scaffoldBackgroundColor: QuykColors.green,
    canvasColor: QuykColors.green,
    cardTheme: const CardThemeData(color: QuykColors.greenPanel, elevation: 0),
    dividerTheme: DividerThemeData(color: Colors.white.withValues(alpha: 0.12), thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: QuykColors.lime),
    dialogTheme: DialogThemeData(
      backgroundColor: QuykColors.greenPanel,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    listTileTheme: const ListTileThemeData(textColor: Colors.white, iconColor: QuykColors.limeSoft),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.08),
      labelStyle: const TextStyle(color: Color(0xFFB8CCC4)),
      hintStyle: const TextStyle(color: Color(0xFF8FA89F)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.16)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.16)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: QuykColors.lime, width: 1.6),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: QuykColors.lime,
        foregroundColor: QuykColors.green,
        minimumSize: const Size(64, 52),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontFamily: quykFontFamily, fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: QuykColors.lime,
        foregroundColor: QuykColors.green,
        elevation: 0,
        shape: const StadiumBorder(),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: BorderSide(color: Colors.white.withValues(alpha: 0.4)),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontFamily: quykFontFamily, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: QuykColors.limeSoft),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? QuykColors.green : Colors.white70,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? QuykColors.lime : Colors.white24,
      ),
    ),
    textTheme: _tvTextScale(
      AppTypography.textTheme(Colors.white, muted: const Color(0xFFB8CCC4)).apply(fontFamily: quykFontFamily),
    ),
  );
}

/// Quyk TV light variant (cream).
ThemeData buildTvLightTheme(Color? accent) {
  final base = buildQuykTheme(identity: ProductIdentity.tvDisplay);
  return base.copyWith(
    colorScheme: base.colorScheme.copyWith(primary: accent ?? QuykColors.green),
    textTheme: _tvTextScale(base.textTheme),
  );
}
