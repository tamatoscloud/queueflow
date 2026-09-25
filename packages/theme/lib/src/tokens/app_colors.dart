import 'package:flutter/material.dart';

/// Quyk brand palette — lime accent on deep forest green.
/// Every package references [AppColors]; never use raw `Color(0x...)` literals.
abstract final class AppColors {
  // Brand
  static const Color primary = Color(0xFFE7FF27);
  static const Color primaryLight = Color(0xFFF0FF6A);
  static const Color primaryDark = Color(0xFFC5DB00);
  static const Color brandForest = Color(0xFF003E31);
  static const Color brandForestLight = Color(0xFF0A5C4A);
  static const Color secondary = Color(0xFF0A5C4A);
  static const Color secondaryLight = Color(0xFF147A64);
  static const Color accent = Color(0xFFE7FF27);
  static const Color accentPurple = Color(0xFF147A64);

  // Semantic
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF0A5C4A);
  static const Color infoLight = Color(0xFFD1FAF0);

  // Neutral — light
  static const Color neutral50 = Color(0xFFF5F7F6);
  static const Color neutral100 = Color(0xFFECF1EF);
  static const Color neutral200 = Color(0xFFD7E0DC);
  static const Color neutral300 = Color(0xFFB7C5BF);
  static const Color neutral400 = Color(0xFF8A9A93);
  static const Color neutral500 = Color(0xFF5F7068);
  static const Color neutral600 = Color(0xFF45554E);
  static const Color neutral700 = Color(0xFF2F3D37);
  static const Color neutral800 = Color(0xFF1B2924);
  static const Color neutral900 = Color(0xFF0C1613);
  static const Color neutral950 = Color(0xFF06100D);

  // Surfaces — light
  static const Color lightBackground = Color(0xFFF5F7F6);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightElevated = Color(0xFFFFFFFF);
  static const Color lightOnSurface = Color(0xFF0C1613);
  static const Color lightOnSurfaceMuted = Color(0xFF5F7068);
  static const Color lightBorder = Color(0xFFD7E0DC);

  // Surfaces — dark (forest-led)
  static const Color darkBackground = Color(0xFF003E31);
  static const Color darkSurface = Color(0xFF0A4A3B);
  static const Color darkElevated = Color(0xFF0F5645);
  static const Color darkOnSurface = Color(0xFFF5F7F6);
  static const Color darkOnSurfaceMuted = Color(0xFFB7C5BF);
  static const Color darkBorder = Color(0xFF1A6352);

  // Legacy aliases
  static const Color error = danger;
  static const Color lightOnSurfaceLegacy = lightOnSurface;

  // Calm Premium palette — hospitality warmth aligned to Quyk
  static const Color calmIvory = Color(0xFFF7FAF8);
  static const Color calmViolet = Color(0xFF0A5C4A);
  static const Color calmVioletDeep = Color(0xFF003E31);
  static const Color calmLilac = Color(0xFFE8F7E0);
  static const Color calmLilacLight = Color(0xFFF3FCE8);
  static const Color calmPeach = Color(0xFFF9DDC7);
  static const Color calmCharcoal = Color(0xFF0C1613);
  static const Color calmWarmGray = Color(0xFF5F7068);
  static const Color calmBorder = Color(0xFFD7E0DC);

  /// Text / icons on primary (lime) surfaces.
  static const Color onPrimary = brandForest;

  // Queue entry status (restaurant floor) — map to brand semantics
  static const Color waiting = brandForest;
  static const Color waitingSoft = Color(0xFFE8F7E0);
  static const Color called = Color(0xFFC5DB00);
  static const Color calledSoft = Color(0xFFF3FCE8);
  static const Color completed = success;
  static const Color completedSoft = successLight;
  static const Color cancelled = danger;
  static const Color cancelledSoft = dangerLight;
  static const Color holding = warning;
  static const Color holdingSoft = warningLight;
  static const Color disabled = neutral300;
}
