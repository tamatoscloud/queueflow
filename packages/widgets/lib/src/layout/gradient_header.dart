import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

/// Gradient page header for dashboards and auth screens.
class GradientHeader extends StatelessWidget {
  const GradientHeader({
    required this.title,
    super.key,
    this.subtitle,
    this.trailing,
    this.gradient,
    this.compact = false,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Gradient? gradient;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        compact ? AppSpacing.md : AppSpacing.lg,
        AppSpacing.lg,
        compact ? AppSpacing.md : AppSpacing.lg,
      ),
      decoration: BoxDecoration(
        gradient: gradient ?? AppGradients.primary,
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(28),
        ),
        boxShadow: AppShadows.md(Theme.of(context).brightness),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitle!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.primary.withValues(alpha: 0.85),
                        ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
