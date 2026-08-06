import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/models/notification_model.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';

String humanizeNotification(NotificationModel n) {
  if (n.message != null && n.message!.trim().isNotEmpty) {
    return n.message!.trim();
  }
  return switch (n.type.toUpperCase()) {
    'CUSTOMER_JOINED' || 'JOIN' => 'A guest joined the queue',
    'CUSTOMER_CALLED' || 'CALLED' => 'A guest was called',
    'CUSTOMER_COMPLETED' || 'COMPLETED' => 'A visit was completed',
    'QUEUE_PAUSED' => 'A queue was paused',
    'QUEUE_RESUMED' => 'A queue was reopened',
    _ => n.type.replaceAll('_', ' ').toLowerCase(),
  };
}

class CalmLiveActivity extends StatelessWidget {
  const CalmLiveActivity({required this.notifications, super.key});

  final List<NotificationModel> notifications;

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CalmSectionLabel('Live activity'),
          const SizedBox(height: AppSpacing.sm),
          CalmCard(
            child: Text(
              'Activity will appear here as guests join and move through your queues.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.calmWarmGray,
                  ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Live activity'),
        const SizedBox(height: AppSpacing.sm),
        ...notifications.take(6).map(
              (n) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: CalmCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.circle, size: 8, color: AppColors.calmViolet),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          humanizeNotification(n),
                          style: Theme.of(context).textTheme.bodyMedium,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
      ],
    );
  }
}
