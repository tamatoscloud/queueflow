import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/models/queue_model.dart';
import '../../../../core/network/business_api_client.dart';
import '../../../../core/session/session_providers.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';
import '../../../restaurant_demo/presentation/service_mode_helpers.dart';

final modeAnalyticsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final branchId = ref.watch(selectedBranchIdProvider);
  return api.getModeAnalytics(branchId: branchId);
});

class ServicePerformancePanel extends ConsumerWidget {
  const ServicePerformancePanel({required this.queues, super.key});

  final List<QueueModel> queues;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(modeAnalyticsProvider);

    return async.when(
      loading: () => const CalmCard(
        child: SizedBox(
          height: 80,
          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ),
      ),
      error: (_, __) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CalmSectionLabel('How each line is doing'),
          const SizedBox(height: AppSpacing.sm),
          CalmCard(
            child: Text(
              'We couldn\'t load how each line is doing right now.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.calmWarmGray,
                  ),
            ),
          ),
        ],
      ),
      data: (analytics) {
        final byMode = analytics['byMode'] as Map<String, dynamic>? ?? {};
        final modes = ['DINE_IN', 'TAKEAWAY', 'DRIVE_IN'];
        final cards = <Widget>[];

        for (final mode in modes) {
          final stats = byMode[mode] as Map<String, dynamic>? ?? {};
          final served = stats['completed'] as int? ?? 0;
          final avgWait = stats['avgWait'] as int? ?? 0;
          final hasQueues = queues.any((q) => q.serviceMode == mode);
          if (!hasQueues) continue;
          if (served == 0 && avgWait == 0) continue;

          final info = ServiceModeInfo.forMode(mode);
          final waitLine = avgWait > 0 ? '~$avgWait min average wait' : 'Not enough data yet';

          cards.add(
            CalmCard(
              child: Row(
                children: [
                  Icon(info.icon, color: AppColors.calmViolet, size: 20),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          info.label,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        Text(
                          served > 0 ? '$served served · $waitLine' : waitLine,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.calmWarmGray,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        if (cards.isEmpty) {
          return const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CalmSectionLabel('How each line is doing'),
              SizedBox(height: AppSpacing.sm),
              CalmCard(
                child: Text('Not enough data yet. Performance will appear as guests are served.'),
              ),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CalmSectionLabel('How each line is doing', subtitle: 'Today by dine-in, takeaway, and drive-thru'),
            const SizedBox(height: AppSpacing.sm),
            ...cards.map(
              (c) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: c,
              ),
            ),
          ],
        );
      },
    );
  }
}
