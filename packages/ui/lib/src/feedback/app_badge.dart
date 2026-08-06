import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

enum AppBadgeVariant { primary, secondary, success, warning, danger, info, neutral }

/// Compact status badge with semantic colors.
class AppBadge extends StatelessWidget {
  const AppBadge({
    required this.label,
    super.key,
    this.variant = AppBadgeVariant.neutral,
    this.icon,
  });

  final String label;
  final AppBadgeVariant variant;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors(variant);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: fg,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
          ),
        ],
      ),
    );
  }

  (Color, Color) _colors(AppBadgeVariant variant) => switch (variant) {
        AppBadgeVariant.primary => (
            AppColors.primary.withValues(alpha: 0.12),
            AppColors.primary,
          ),
        AppBadgeVariant.secondary => (
            AppColors.secondary.withValues(alpha: 0.12),
            AppColors.secondary,
          ),
        AppBadgeVariant.success => (AppColors.successLight, AppColors.success),
        AppBadgeVariant.warning => (AppColors.warningLight, AppColors.warning),
        AppBadgeVariant.danger => (AppColors.dangerLight, AppColors.danger),
        AppBadgeVariant.info => (AppColors.infoLight, AppColors.info),
        AppBadgeVariant.neutral => (
            AppColors.neutral100,
            AppColors.neutral600,
          ),
      };
}
