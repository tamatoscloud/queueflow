import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmCard extends StatelessWidget {
  const CalmCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.onTap,
    this.highlighted = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: highlighted ? AppColors.calmLilac.withValues(alpha: 0.45) : AppColors.lightSurface,
        borderRadius: AppRadius.lgAll,
        border: Border.all(
          color: highlighted ? AppColors.calmViolet.withValues(alpha: 0.25) : AppColors.calmBorder,
        ),
      ),
      child: child,
    );

    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, borderRadius: AppRadius.lgAll, child: card),
    );
  }
}
