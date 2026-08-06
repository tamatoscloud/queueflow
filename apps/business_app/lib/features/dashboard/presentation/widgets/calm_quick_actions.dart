import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/routing/app_routes.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';

class CalmQuickActions extends StatelessWidget {
  const CalmQuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    final actions = [
      (icon: Icons.qr_code_2_outlined, label: 'QR Center', route: AppRoutes.restaurantQr),
      (icon: Icons.queue_outlined, label: 'Queues', route: AppRoutes.queues),
      (icon: Icons.badge_outlined, label: 'Staff', route: AppRoutes.staff),
      (icon: Icons.bar_chart_outlined, label: 'Reports', route: AppRoutes.reports),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Quick actions'),
        const SizedBox(height: AppSpacing.sm),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.sm,
          crossAxisSpacing: AppSpacing.sm,
          childAspectRatio: 2.2,
          children: [
            for (final action in actions)
              CalmCard(
                onTap: () => context.push(action.route),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                child: Row(
                  children: [
                    Icon(action.icon, color: AppColors.calmViolet, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      action.label,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}
