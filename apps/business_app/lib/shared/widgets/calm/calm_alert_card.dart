import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';
import 'calm_primary_button.dart';

enum CalmAlertSeverity { attention, info, completed }

class CalmAlertCard extends StatelessWidget {
  const CalmAlertCard({
    required this.title,
    required this.message,
    required this.detail,
    required this.severity,
    super.key,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String detail;
  final CalmAlertSeverity severity;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final accent = switch (severity) {
      CalmAlertSeverity.attention => AppColors.warning,
      CalmAlertSeverity.info => AppColors.calmViolet,
      CalmAlertSeverity.completed => AppColors.success,
    };

    return CalmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmCharcoal,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmCharcoal),
          ),
          const SizedBox(height: 4),
          Text(
            detail,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.md),
            CalmPrimaryButton(label: actionLabel!, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}
