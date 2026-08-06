import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'admin_calm_helpers.dart';
import 'calm_card.dart';
import 'calm_status_dot.dart';

class CalmBusinessCard extends StatelessWidget {
  const CalmBusinessCard({
    required this.name,
    required this.subtitle,
    required this.detail,
    required this.status,
    super.key,
    this.onTap,
    this.actionLabel = 'View',
  });

  final String name;
  final String subtitle;
  final String detail;
  final CalmPlatformStatus status;
  final VoidCallback? onTap;
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.calmCharcoal,
                      ),
                ),
              ),
              CalmStatusDot(status: status, showText: false),
              const SizedBox(width: 4),
              Text(
                calmStatusLabel(status),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: calmStatusColor(status),
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
          const SizedBox(height: 4),
          Text(detail, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
          if (onTap != null) ...[
            const SizedBox(height: AppSpacing.md),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(onPressed: onTap, child: Text(actionLabel)),
            ),
          ],
        ],
      ),
    );
  }
}
