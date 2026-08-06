import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Frosted glass floating panel — glassmorphism surface.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    required this.child,
    super.key,
    this.padding,
    this.margin,
    this.borderRadius,
    this.onTap,
    this.blur = 16,
    this.opacity,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;
  final VoidCallback? onTap;
  final double blur;
  final double? opacity;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isLight = brightness == Brightness.light;
    final bgOpacity = opacity ?? (isLight ? 0.72 : 0.65);
    final radius = borderRadius ?? AppRadius.xlAll;

    Widget panel = ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding ?? const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: radius,
            color: isLight
                ? Colors.white.withValues(alpha: bgOpacity)
                : AppColors.darkElevated.withValues(alpha: bgOpacity),
            border: Border.all(
              color: isLight
                  ? Colors.white.withValues(alpha: 0.5)
                  : Colors.white.withValues(alpha: 0.08),
            ),
            boxShadow: AppShadows.md(brightness),
          ),
          child: child,
        ),
      ),
    );

    if (margin != null) {
      panel = Padding(padding: margin!, child: panel);
    }

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: panel,
        ),
      );
    }

    return panel;
  }
}
