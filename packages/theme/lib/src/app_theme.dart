import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens/app_colors.dart';
import 'tokens/app_radius.dart';
import 'tokens/app_shadows.dart';
import 'tokens/app_typography.dart';

/// Assembles `ThemeData` from design tokens. Apps use [AppTheme.light]/[dark].
abstract final class AppTheme {
  static ThemeData get light => _build(
        brightness: Brightness.light,
        background: AppColors.lightBackground,
        surface: AppColors.lightSurface,
        elevated: AppColors.lightElevated,
        onSurface: AppColors.lightOnSurface,
        onMuted: AppColors.lightOnSurfaceMuted,
        border: AppColors.lightBorder,
      );

  static ThemeData get dark => _build(
        brightness: Brightness.dark,
        background: AppColors.darkBackground,
        surface: AppColors.darkSurface,
        elevated: AppColors.darkElevated,
        onSurface: AppColors.darkOnSurface,
        onMuted: AppColors.darkOnSurfaceMuted,
        border: AppColors.darkBorder,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color background,
    required Color surface,
    required Color elevated,
    required Color onSurface,
    required Color onMuted,
    required Color border,
  }) {
    final isLight = brightness == Brightness.light;
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primary.withValues(alpha: 0.12),
      onPrimaryContainer: AppColors.primaryDark,
      secondary: AppColors.secondary,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.secondary.withValues(alpha: 0.12),
      onSecondaryContainer: AppColors.secondary,
      tertiary: AppColors.accent,
      onTertiary: Colors.white,
      error: AppColors.danger,
      onError: Colors.white,
      surface: surface,
      onSurface: onSurface,
      onSurfaceVariant: onMuted,
      outline: border,
      outlineVariant: border.withValues(alpha: 0.6),
      shadow: AppColors.neutral900.withValues(alpha: 0.08),
      surfaceContainerHighest: elevated,
    );

    final textTheme = AppTypography.textTheme(onSurface, muted: onMuted);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      fontFamily: AppTypography.fontFamily,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: isLight ? surface.withValues(alpha: 0.85) : surface,
        foregroundColor: onSurface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge,
        systemOverlayStyle: isLight
            ? SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.xlAll,
          side: BorderSide(color: border.withValues(alpha: 0.8)),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
          textStyle: textTheme.labelLarge?.copyWith(color: Colors.white),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          elevation: 0,
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: onSurface,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
          side: BorderSide(color: border),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isLight ? AppColors.neutral50 : AppColors.darkElevated,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: AppRadius.lgAll,
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.lgAll,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.lgAll,
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.lgAll,
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(color: onMuted),
        labelStyle: textTheme.labelMedium,
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.fullAll),
        side: BorderSide.none,
        labelStyle: textTheme.labelSmall,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        height: 72,
        backgroundColor: surface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelSmall?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            );
          }
          return textTheme.labelSmall?.copyWith(color: onMuted);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary);
          }
          return IconThemeData(color: onMuted);
        }),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: surface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.12),
        selectedIconTheme: const IconThemeData(color: AppColors.primary),
        unselectedIconTheme: IconThemeData(color: onMuted),
        selectedLabelTextStyle: textTheme.labelMedium?.copyWith(
          color: AppColors.primary,
        ),
        unselectedLabelTextStyle: textTheme.labelMedium?.copyWith(color: onMuted),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        backgroundColor: isLight ? AppColors.neutral800 : AppColors.darkElevated,
      ),
      dialogTheme: DialogThemeData(
        elevation: 0,
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.xxlAll),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      listTileTheme: ListTileThemeData(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.neutral200,
      ),
      extensions: [
        _AppThemeExtension(
          elevated: elevated,
          border: border,
          onMuted: onMuted,
          shadows: AppShadows.md(brightness),
        ),
      ],
    );
  }
}

class _AppThemeExtension extends ThemeExtension<_AppThemeExtension> {
  const _AppThemeExtension({
    required this.elevated,
    required this.border,
    required this.onMuted,
    required this.shadows,
  });

  final Color elevated;
  final Color border;
  final Color onMuted;
  final List<BoxShadow> shadows;

  @override
  _AppThemeExtension copyWith({
    Color? elevated,
    Color? border,
    Color? onMuted,
    List<BoxShadow>? shadows,
  }) =>
      _AppThemeExtension(
        elevated: elevated ?? this.elevated,
        border: border ?? this.border,
        onMuted: onMuted ?? this.onMuted,
        shadows: shadows ?? this.shadows,
      );

  @override
  _AppThemeExtension lerp(ThemeExtension<_AppThemeExtension>? other, double t) {
    if (other is! _AppThemeExtension) return this;
    return _AppThemeExtension(
      elevated: Color.lerp(elevated, other.elevated, t)!,
      border: Color.lerp(border, other.border, t)!,
      onMuted: Color.lerp(onMuted, other.onMuted, t)!,
      shadows: shadows,
    );
  }
}

/// Convenience accessor for custom theme extension values.
extension AppThemeContext on BuildContext {
  _AppThemeExtension get appTheme =>
      Theme.of(this).extension<_AppThemeExtension>()!;
}
