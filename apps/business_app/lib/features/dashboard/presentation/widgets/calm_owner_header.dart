import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/models/queue_model.dart';
import '../../../../core/models/report_model.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_live_indicator.dart';

enum RestaurantHealth { allGood, busy, needsAttention }

RestaurantHealth resolveRestaurantHealth({
  required int waiting,
  required DailySummaryModel summary,
  required List<QueueModel> queues,
}) {
  final pausedCount = queues.where((q) => q.isPaused).length;
  if (pausedCount > 0 && waiting > 0) return RestaurantHealth.needsAttention;
  if (summary.noShows >= 5) return RestaurantHealth.needsAttention;
  if (waiting > 15 || (waiting > 0 && summary.averageWaitMinutes > 25)) {
    return RestaurantHealth.needsAttention;
  }
  if (waiting > 5) return RestaurantHealth.busy;
  return RestaurantHealth.allGood;
}

String healthLabel(RestaurantHealth health) => switch (health) {
      RestaurantHealth.allGood => 'Looking good',
      RestaurantHealth.busy => 'Busy right now',
      RestaurantHealth.needsAttention => 'Needs attention',
    };

class CalmOwnerHeader extends StatelessWidget {
  const CalmOwnerHeader({
    required this.ownerName,
    required this.businessName,
    required this.waiting,
    required this.summary,
    required this.queues,
    required this.connectionLabel,
    super.key,
  });

  final String ownerName;
  final String businessName;
  final int waiting;
  final DailySummaryModel summary;
  final List<QueueModel> queues;
  final String connectionLabel;

  @override
  Widget build(BuildContext context) {
    final health = resolveRestaurantHealth(
      waiting: waiting,
      summary: summary,
      queues: queues,
    );
    final product = context.productTheme;
    final firstName = ownerName.split(' ').first;

    return CalmCard(
      highlighted: health == RestaurantHealth.needsAttention,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good ${_greeting()}, $firstName',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      businessName,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontFamily: 'Georgia',
                            fontWeight: FontWeight.w700,
                            color: AppColors.calmCharcoal,
                          ),
                    ),
                  ],
                ),
              ),
              CalmLiveIndicator(label: connectionLabel),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            healthLabel(health),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: product.accent,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            waiting > 0
                ? '$waiting waiting across your queues'
                : 'Queues are clear — ready for guests',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.calmWarmGray,
                ),
          ),
        ],
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}
