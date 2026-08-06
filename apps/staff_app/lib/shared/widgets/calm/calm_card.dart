import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Calm Premium surfaces for staff operational screens.
class CalmCard extends StatelessWidget {
  const CalmCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.onTap,
    this.backgroundColor,
    this.highlighted = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ??
        (highlighted ? AppColors.calmLilac.withValues(alpha: 0.45) : AppColors.lightSurface);

    final card = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.lgAll,
        border: Border.all(
          color: highlighted ? AppColors.calmViolet.withValues(alpha: 0.25) : AppColors.calmBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.calmCharcoal.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );

    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.lgAll,
        child: card,
      ),
    );
  }
}
