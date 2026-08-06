import 'package:flutter/widgets.dart';

/// Responsive breakpoints used by every app instead of a third-party
/// responsive-layout package — keeps the dependency surface minimal and
/// gives us full control over tablet-optimized layouts (business_app).
abstract final class Breakpoints {
  static const double mobile = 600;
  static const double tablet = 1024;
  static const double desktop = 1440;

  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < mobile;

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= mobile && width < desktop;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= desktop;

  /// Generic responsive value picker, e.g.
  /// `Breakpoints.value(context, mobile: 1, tablet: 2, desktop: 3)`.
  static T value<T>(
    BuildContext context, {
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= Breakpoints.desktop) return desktop ?? tablet ?? mobile;
    if (width >= Breakpoints.mobile) return tablet ?? mobile;
    return mobile;
  }
}
