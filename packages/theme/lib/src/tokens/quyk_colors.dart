import 'package:flutter/material.dart';

/// Quyk redesign palette (Figma "Quyk Redesign Staff" / "Quyk Redesign User").
///
/// Additive: existing [AppColors] tokens are unchanged so apps can adopt the
/// redesign one at a time.
abstract final class QuykColors {
  /// Deep green — rails, hero panels, primary buttons, headings.
  static const Color green = Color(0xFF003D32);

  /// Slightly lighter green used for panels on top of [green].
  static const Color greenPanel = Color(0xFF0B5444);

  /// Muted green for secondary text on light surfaces.
  static const Color greenMuted = Color(0xFF3B6B5D);

  /// Brand lime — call-to-action, active nav, highlights.
  static const Color lime = Color(0xFFE4FF2C);

  /// Soft lime for icon bubbles.
  static const Color limeSoft = Color(0xFFF1FFA6);

  /// Very light lime for selected rows and notices.
  static const Color limeTint = Color(0xFFF8FFD6);

  /// Page background.
  static const Color cream = Color(0xFFF3F7EA);

  /// Card borders and dividers.
  static const Color line = Color(0xFFE5ECD8);

  /// Input and outline-button borders.
  static const Color field = Color(0xFFD6DFCF);

  /// Neutral pill / minus button fill.
  static const Color mist = Color(0xFFE3EADB);

  /// Body text.
  static const Color ink = Color(0xFF0F1F1A);

  /// Secondary text.
  static const Color muted = Color(0xFF5E6B66);

  /// Tertiary text, table headers.
  static const Color subtle = Color(0xFF8A958F);

  /// Star ratings.
  static const Color star = Color(0xFFFFB82E);

  /// Warning banner (e.g. "WhatsApp and SMS sending isn't connected yet").
  static const Color warningTint = Color(0xFFFFF1D1);
  static const Color warning = Color(0xFFF0A92B);

  /// Failed / danger pills.
  static const Color dangerTint = Color(0xFFFDE7E5);
  static const Color danger = Color(0xFFC63D3D);

  /// Peach bubble (takeaway lines).
  static const Color peach = Color(0xFFFFF1D1);
}
