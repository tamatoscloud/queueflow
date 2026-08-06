import 'package:flutter/material.dart';

/// Premium SaaS color palette — vibrant, accessible, light + dark ready.
/// Every package references [AppColors]; never use raw `Color(0x...)` literals.
abstract final class AppColors {
  // Brand
  static const Color primary = Color(0xFF6366F1);
  static const Color primaryLight = Color(0xFF818CF8);
  static const Color primaryDark = Color(0xFF4F46E5);
  static const Color secondary = Color(0xFF06B6D4);
  static const Color secondaryLight = Color(0xFF22D3EE);
  static const Color accent = Color(0xFFEC4899);
  static const Color accentPurple = Color(0xFFA855F7);

  // Semantic
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Neutral — light
  static const Color neutral50 = Color(0xFFF8FAFC);
  static const Color neutral100 = Color(0xFFF1F5F9);
  static const Color neutral200 = Color(0xFFE2E8F0);
  static const Color neutral300 = Color(0xFFCBD5E1);
  static const Color neutral400 = Color(0xFF94A3B8);
  static const Color neutral500 = Color(0xFF64748B);
  static const Color neutral600 = Color(0xFF475569);
  static const Color neutral700 = Color(0xFF334155);
  static const Color neutral800 = Color(0xFF1E293B);
  static const Color neutral900 = Color(0xFF0F172A);
  static const Color neutral950 = Color(0xFF020617);

  // Surfaces — light
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightElevated = Color(0xFFFFFFFF);
  static const Color lightOnSurface = Color(0xFF0F172A);
  static const Color lightOnSurfaceMuted = Color(0xFF64748B);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Surfaces — dark
  static const Color darkBackground = Color(0xFF0B0D12);
  static const Color darkSurface = Color(0xFF151821);
  static const Color darkElevated = Color(0xFF1C2030);
  static const Color darkOnSurface = Color(0xFFF1F5F9);
  static const Color darkOnSurfaceMuted = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF2A3042);

  // Legacy aliases
  static const Color error = danger;
  static const Color lightOnSurfaceLegacy = lightOnSurface;

  // Calm Premium palette — hospitality warmth (extend, do not replace brand)
  static const Color calmIvory = Color(0xFFFCFAF7);
  static const Color calmViolet = Color(0xFF8B7CF8);
  static const Color calmVioletDeep = Color(0xFF7C3AED);
  static const Color calmLilac = Color(0xFFEAE5F8);
  static const Color calmLilacLight = Color(0xFFDCD4FF);
  static const Color calmPeach = Color(0xFFF9DDC7);
  static const Color calmCharcoal = Color(0xFF17151A);
  static const Color calmWarmGray = Color(0xFF6B6870);
  static const Color calmBorder = Color(0xFFE8E3E8);
}
