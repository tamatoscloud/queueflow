import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../../core/models/report_model.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';

class CalmAvgWaitCard extends StatelessWidget {
  const CalmAvgWaitCard({required this.summary, super.key});

  final DailySummaryModel summary;

  @override
  Widget build(BuildContext context) {
    final hasWait = summary.averageWaitMinutes > 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Average wait'),
        const SizedBox(height: AppSpacing.sm),
        CalmCard(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (hasWait)
                      AnimatedCounter(
                        value: summary.averageWaitMinutes,
                        suffix: ' min',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.calmCharcoal,
                            ),
                      )
                    else
                      Text(
                        'Not enough data yet',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      hasWait ? 'Across today\'s activity' : 'Will appear as guests join',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                ),
              ),
              if (summary.hasActivity) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${summary.totalServed}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    Text(
                      'served today',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.calmWarmGray,
                          ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
