import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Brand gradients for headers, cards, and hero sections.
abstract final class AppGradients {
  static const LinearGradient primary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.brandForest, AppColors.brandForestLight],
  );

  static const LinearGradient secondary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.brandForestLight, AppColors.primaryDark],
  );

  static const LinearGradient accent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primaryDark, AppColors.primary],
  );

  static const LinearGradient success = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF10B981), Color(0xFF0A5C4A)],
  );

  static const LinearGradient warm = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
  );

  static LinearGradient meshLight = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      AppColors.primary.withValues(alpha: 0.18),
      AppColors.brandForest.withValues(alpha: 0.06),
      AppColors.secondary.withValues(alpha: 0.04),
    ],
  );

  static LinearGradient meshDark = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      AppColors.primary.withValues(alpha: 0.12),
      AppColors.brandForestLight.withValues(alpha: 0.55),
      AppColors.darkBackground,
    ],
  );

  static LinearGradient glassOverlay(Brightness brightness) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: brightness == Brightness.light
            ? [
                Colors.white.withValues(alpha: 0.85),
                Colors.white.withValues(alpha: 0.65),
              ]
            : [
                AppColors.darkElevated.withValues(alpha: 0.85),
                AppColors.darkSurface.withValues(alpha: 0.65),
              ],
      );
}
