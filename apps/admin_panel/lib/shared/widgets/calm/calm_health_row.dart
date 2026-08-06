import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'admin_calm_helpers.dart';
import 'calm_card.dart';
import 'calm_section_label.dart';
import 'calm_status_dot.dart';

class CalmHealthRow extends StatelessWidget {
  const CalmHealthRow({
    required this.name,
    required this.status,
    super.key,
    this.summary,
    this.technicalDetails,
    this.onViewDetails,
  });

  final String name;
  final CalmPlatformStatus status;
  final String? summary;
  final String? technicalDetails;
  final VoidCallback? onViewDetails;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(top: AppSpacing.sm),
        title: Text(name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: CalmStatusDot(status: status),
        ),
        children: [
          if (summary != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Text(summary!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmCharcoal)),
            ),
          if (technicalDetails != null && technicalDetails!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            const CalmSectionLabel('Technical details'),
            const SizedBox(height: 4),
            SelectableText(
              technicalDetails!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
            ),
          ],
          if (onViewDetails != null) ...[
            const SizedBox(height: AppSpacing.sm),
            TextButton(onPressed: onViewDetails, child: const Text('View details')),
          ],
        ],
      ),
    );
  }
}
