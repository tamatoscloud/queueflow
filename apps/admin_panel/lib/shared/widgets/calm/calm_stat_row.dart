import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';

class CalmStatRow extends StatelessWidget {
  const CalmStatRow({
    required this.label,
    required this.value,
    super.key,
    this.subtitle,
  });

  final String label;
  final String value;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.calmCharcoal,
                ),
          ),
          const SizedBox(height: 2),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
          ],
        ],
      ),
    );
  }
}
