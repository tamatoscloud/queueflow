import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Calm Premium surfaces for owner operational screens.
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
    final bg = highlighted
        ? QuykColors.limeSoft.withValues(alpha: 0.45)
        : Colors.white;

    final card = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.lgAll,
        border: Border.all(
          color: highlighted
              ? QuykColors.green.withValues(alpha: 0.25)
              : QuykColors.line,
        ),
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
