import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Soft elevation shadows for cards, sheets, and floating elements.
abstract final class AppShadows {
  static List<BoxShadow> sm(Brightness brightness) => [
        BoxShadow(
          color: _shadowColor(brightness, 0.04),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> md(Brightness brightness) => [
        BoxShadow(
          color: _shadowColor(brightness, 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: _shadowColor(brightness, 0.03),
          blurRadius: 4,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> lg(Brightness brightness) => [
        BoxShadow(
          color: _shadowColor(brightness, 0.10),
          blurRadius: 32,
          offset: const Offset(0, 8),
        ),
        BoxShadow(
          color: _shadowColor(brightness, 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> glow(Color color) => [
        BoxShadow(
          color: color.withValues(alpha: 0.35),
          blurRadius: 24,
          spreadRadius: 2,
        ),
      ];

  static Color _shadowColor(Brightness brightness, double opacity) {
    return brightness == Brightness.light
        ? AppColors.neutral900.withValues(alpha: opacity)
        : Colors.black.withValues(alpha: opacity * 2);
  }
}
