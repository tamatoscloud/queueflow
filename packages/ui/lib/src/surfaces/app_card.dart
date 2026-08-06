import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

enum AppCardVariant { elevated, outlined, filled, gradient }

/// Premium card with optional gradient header and glass effect.
class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    super.key,
    this.variant = AppCardVariant.elevated,
    this.padding,
    this.gradient,
    this.onTap,
  });

  final Widget child;
  final AppCardVariant variant;
  final EdgeInsetsGeometry? padding;
  final Gradient? gradient;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final border = Theme.of(context).colorScheme.outline;

    final decoration = switch (variant) {
      AppCardVariant.elevated => BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: AppRadius.xlAll,
          border: Border.all(color: border.withValues(alpha: 0.6)),
          boxShadow: AppShadows.md(brightness),
        ),
      AppCardVariant.outlined => BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: AppRadius.xlAll,
          border: Border.all(color: border),
        ),
      AppCardVariant.filled => BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: AppRadius.xlAll,
        ),
      AppCardVariant.gradient => BoxDecoration(
          gradient: gradient ?? AppGradients.primary,
          borderRadius: AppRadius.xlAll,
          boxShadow: AppShadows.md(brightness),
        ),
    };

    final content = Padding(
      padding: padding ?? const EdgeInsets.all(AppSpacing.md),
      child: child,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.xlAll,
        child: Ink(
          decoration: decoration,
          child: content,
        ),
      ),
    );
  }
}
