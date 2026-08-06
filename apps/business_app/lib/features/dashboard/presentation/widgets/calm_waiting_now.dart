import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../../core/models/queue_model.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';
import '../../../restaurant_demo/presentation/service_mode_helpers.dart';

class CalmWaitingNow extends StatelessWidget {
  const CalmWaitingNow({required this.queues, super.key});

  final List<QueueModel> queues;

  @override
  Widget build(BuildContext context) {
    final modes = ['DINE_IN', 'TAKEAWAY', 'DRIVE_IN'];
    final rows = <Widget>[];

    for (final mode in modes) {
      final info = ServiceModeInfo.forMode(mode);
      final count = waitingForMode(queues, mode);
      if (!queues.any((q) => q.serviceMode == mode)) continue;
      rows.add(
        Expanded(
          child: CalmCard(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.lg),
            child: Column(
              children: [
                Icon(info.icon, color: AppColors.calmViolet, size: 22),
                const SizedBox(height: 8),
                AnimatedCounter(
                  value: count,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.calmCharcoal,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  info.waitingUnitLabel(count),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.calmWarmGray,
                      ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (rows.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Waiting now'),
        const SizedBox(height: AppSpacing.sm),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < rows.length; i++) ...[
                if (i > 0) const SizedBox(width: AppSpacing.sm),
                rows[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}
