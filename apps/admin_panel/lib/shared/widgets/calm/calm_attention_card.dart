import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';
import 'calm_primary_button.dart';

class CalmAttentionCard extends StatelessWidget {
  const CalmAttentionCard({
    required this.title,
    required this.message,
    required this.detail,
    super.key,
    this.actionLabel,
    this.onAction,
    this.severity = CalmAttentionSeverity.warning,
  });

  final String title;
  final String message;
  final String detail;
  final String? actionLabel;
  final VoidCallback? onAction;
  final CalmAttentionSeverity severity;

  @override
  Widget build(BuildContext context) {
    final accent = switch (severity) {
      CalmAttentionSeverity.critical => AppColors.danger,
      CalmAttentionSeverity.warning => AppColors.warning,
      CalmAttentionSeverity.info => AppColors.calmViolet,
    };

    return CalmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(message, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 4),
          Text(detail, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.md),
            CalmPrimaryButton(label: actionLabel!, onPressed: onAction, compact: true),
          ],
        ],
      ),
    );
  }
}

enum CalmAttentionSeverity { critical, warning, info }
