import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Disables Google Fonts HTTP fetches and preloads bundled Inter weights
/// used by [AppTypography] so widget/golden tests render deterministically.
///
/// Call from `test/flutter_test_config.dart` after
/// [TestWidgetsFlutterBinding.ensureInitialized].
Future<void> configureQueueflowFonts() async {
  GoogleFonts.config.allowRuntimeFetching = false;

  await GoogleFonts.pendingFonts([
    GoogleFonts.inter(),
    GoogleFonts.inter(fontWeight: FontWeight.w500),
    GoogleFonts.inter(fontWeight: FontWeight.w600),
    GoogleFonts.inter(fontWeight: FontWeight.w700),
    GoogleFonts.inter(fontWeight: FontWeight.w800),
  ]);
}
