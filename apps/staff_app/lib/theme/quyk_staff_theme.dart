import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Font family declared in the staff app's pubspec (Hanken Grotesk, SIL OFL).
const String quykFontFamily = 'HankenGrotesk';

/// Material theme for the Quyk staff redesign (Figma "Quyk Redesign Staff").
///
/// Built on top of [AppTheme.light] so shared theme extensions keep working,
/// with the Quyk green / lime / cream palette from [QuykColors].
ThemeData buildQuykStaffTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: QuykColors.green,
    primary: QuykColors.green,
    onPrimary: QuykColors.lime,
    secondary: QuykColors.lime,
    onSecondary: QuykColors.green,
    surface: Colors.white,
    onSurface: QuykColors.ink,
    error: QuykColors.danger,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    fontFamily: quykFontFamily,
    scaffoldBackgroundColor: QuykColors.cream,
    canvasColor: QuykColors.cream,
    dividerColor: QuykColors.line,
    splashFactory: InkRipple.splashFactory,
  );

  const stadium = StadiumBorder();
  final fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: QuykColors.field),
  );

  return base.copyWith(
    extensions: [
      ...AppTheme.light.extensions.values,
      const ProductTheme(identity: ProductIdentity.staff),
    ],
    textTheme: base.textTheme.apply(
      bodyColor: QuykColors.ink,
      displayColor: QuykColors.green,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: QuykColors.cream,
      foregroundColor: QuykColors.green,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: QuykColors.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: const TextStyle(color: QuykColors.subtle),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: fieldBorder,
      enabledBorder: fieldBorder,
      focusedBorder: fieldBorder.copyWith(
        borderSide: const BorderSide(color: QuykColors.green, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: QuykColors.green,
        foregroundColor: QuykColors.lime,
        disabledBackgroundColor: QuykColors.mist,
        disabledForegroundColor: QuykColors.subtle,
        minimumSize: const Size(64, 48),
        shape: stadium,
        textStyle: const TextStyle(
          fontFamily: quykFontFamily,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: QuykColors.green,
        foregroundColor: QuykColors.lime,
        elevation: 0,
        minimumSize: const Size(64, 48),
        shape: stadium,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: QuykColors.green,
        side: const BorderSide(color: QuykColors.green, width: 1.2),
        minimumSize: const Size(64, 44),
        shape: stadium,
        textStyle: const TextStyle(
          fontFamily: quykFontFamily,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: QuykColors.green),
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: QuykColors.green,
      contentTextStyle: TextStyle(
        fontFamily: quykFontFamily,
        color: Colors.white,
        fontWeight: FontWeight.w500,
      ),
      actionTextColor: QuykColors.lime,
      behavior: SnackBarBehavior.floating,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: QuykColors.green,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? QuykColors.lime
            : Colors.white,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? QuykColors.green
            : QuykColors.mist,
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: Colors.white,
      selectedColor: QuykColors.green,
      side: const BorderSide(color: QuykColors.field),
      shape: stadium,
    ),
  );
}
