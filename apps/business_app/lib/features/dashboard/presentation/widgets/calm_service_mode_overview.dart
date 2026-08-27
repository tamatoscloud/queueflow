import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../../core/models/queue_model.dart';
import '../../../../core/routing/app_routes.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';
import '../../../restaurant_demo/presentation/service_mode_helpers.dart';
import 'service_performance_panel.dart';

class CalmServiceModeOverview extends ConsumerWidget {
  const CalmServiceModeOverview({required this.queues, super.key});

  final List<QueueModel> queues;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analytics = ref.watch(modeAnalyticsProvider).valueOrNull;
    final byMode = analytics?['byMode'] as Map<String, dynamic>? ?? {};
    final modes = ['DINE_IN', 'TAKEAWAY', 'DRIVE_IN'];
    final cards = <Widget>[];

    for (final mode in modes) {
      final modeQueues = queuesForMode(queues, mode);
      if (modeQueues.isEmpty) continue;

      final info = ServiceModeInfo.forMode(mode);
      final waiting = waitingForMode(queues, mode);
      final stats = byMode[mode] as Map<String, dynamic>? ?? {};
      final avgWait = stats['avgWait'] as int? ?? 0;
      final isOpen = modeQueues.any((q) => q.isActive && !q.isPaused);
      final isPaused = modeQueues.every((q) => q.isPaused);
      final statusLabel = isPaused ? 'Paused' : (isOpen ? 'Open' : 'Closed');
      final waitLine = avgWait > 0 ? '~$avgWait min' : 'Not enough data yet';
      final targetQueue = modeQueues.first;

      cards.add(
        CalmCard(
          onTap: () => context.push(AppRoutes.queueDetail(targetQueue.id)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(info.icon, color: AppColors.calmViolet, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    info.label.toUpperCase(),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isPaused
                          ? AppColors.warningLight
                          : (isOpen ? AppColors.successLight : AppColors.neutral100),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      statusLabel,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: isPaused
                                ? AppColors.warning
                                : (isOpen ? AppColors.success : AppColors.calmWarmGray),
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AnimatedCounter(
                          value: waiting,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        Text(
                          info.waitingUnitLabel(waiting),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.calmWarmGray,
                              ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        waitLine,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      Text(
                        'avg wait',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.calmWarmGray,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    if (cards.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Ways guests are served'),
        const SizedBox(height: AppSpacing.sm),
        ...cards.map(
          (c) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: c,
          ),
        ),
      ],
    );
  }
}
