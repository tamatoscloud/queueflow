import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import 'calm_card.dart';

class CalmCustomerCard extends StatelessWidget {
  const CalmCustomerCard({
    required this.name,
    required this.subtitle,
    required this.detail,
    super.key,
    this.onTap,
    this.actionLabel = 'View',
  });

  final String name;
  final String subtitle;
  final String detail;
  final VoidCallback? onTap;
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      onTap: onTap,
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.calmLilac,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.calmViolet,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmCharcoal,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                ),
                const SizedBox(height: 4),
                Text(
                  detail,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.calmWarmGray,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ),
          ),
          if (onTap != null)
            TextButton(
              onPressed: onTap,
              child: Text(actionLabel),
            ),
        ],
      ),
    );
  }
}
