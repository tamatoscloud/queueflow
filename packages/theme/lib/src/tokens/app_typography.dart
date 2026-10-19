import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Inter on mobile. Web uses the engine font so the first screen does not
/// wait on fonts.gstatic.com.
abstract final class AppTypography {
  static String? get fontFamily => kIsWeb ? null : GoogleFonts.inter().fontFamily;

  static TextTheme textTheme(Color onSurface, {Color? muted}) {
    final mutedColor = muted ?? onSurface.withValues(alpha: 0.55);
    return TextTheme(
      displayLarge: _style(36, FontWeight.w700, onSurface, -0.5),
      displayMedium: _style(32, FontWeight.w700, onSurface, -0.4),
      displaySmall: _style(28, FontWeight.w700, onSurface, -0.3),
      headlineLarge: _style(24, FontWeight.w700, onSurface, -0.2),
      headlineMedium: _style(20, FontWeight.w600, onSurface, -0.1),
      headlineSmall: _style(18, FontWeight.w600, onSurface),
      titleLarge: _style(18, FontWeight.w600, onSurface),
      titleMedium: _style(16, FontWeight.w600, onSurface),
      titleSmall: _style(14, FontWeight.w600, onSurface),
      bodyLarge: _style(16, FontWeight.w400, onSurface),
      bodyMedium: _style(14, FontWeight.w400, onSurface),
      bodySmall: _style(13, FontWeight.w400, mutedColor),
      labelLarge: _style(14, FontWeight.w600, onSurface),
      labelMedium: _style(12, FontWeight.w600, onSurface),
      labelSmall: _style(11, FontWeight.w500, mutedColor, 0.3),
    );
  }

  static TextStyle _style(
    double size,
    FontWeight weight,
    Color color, [
    double letterSpacing = 0,
  ]) {
    if (kIsWeb) {
      return TextStyle(
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: letterSpacing,
        height: 1.4,
      );
    }
    return GoogleFonts.inter(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: 1.4,
    );
  }
}
