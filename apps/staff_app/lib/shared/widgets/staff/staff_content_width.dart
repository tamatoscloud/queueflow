import 'package:flutter/widgets.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Shared content column width for staff web/tablet so Live Queue content
/// stays readable instead of stretching edge-to-edge on desktop.
abstract final class StaffContentWidth {
  static const double tablet = 720;
  static const double desktop = 840;

  static double maxWidth(BuildContext context) => Breakpoints.value(
        context,
        mobile: MediaQuery.sizeOf(context).width,
        tablet: tablet,
        desktop: desktop,
      );

  static int guestGridColumns(BuildContext context) => Breakpoints.value(
        context,
        mobile: 1,
        tablet: 2,
        desktop: 3,
      );

  /// Centers [child] within the staff content max width and fills height.
  static Widget constrain(BuildContext context, {required Widget child}) {
    final max = maxWidth(context);
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: max),
        child: SizedBox(width: max, child: child),
      ),
    );
  }
}
