import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../../core/models/queue_model.dart';
import '../../../../core/models/report_model.dart';
import '../../../../shared/widgets/calm/calm_card.dart';
import '../../../../shared/widgets/calm/calm_section_label.dart';
import '../../../restaurant_demo/presentation/service_mode_helpers.dart';

class AttentionItem {
  const AttentionItem({required this.message, this.severity = AttentionSeverity.worthChecking});

  final String message;
  final AttentionSeverity severity;
}

enum AttentionSeverity { allGood, worthChecking, needsAttention }

List<AttentionItem> buildAttentionItems({
  required List<QueueModel> queues,
  required DailySummaryModel summary,
}) {
  final items = <AttentionItem>[];

  final longWait = summary.stillActive > 0 &&
      summary.averageWaitMinutes > 25 &&
      summary.averageWaitMinutes > 0;
  if (longWait) {
    items.add(AttentionItem(
      message:
          '${summary.stillActive} guests have been waiting around ${summary.averageWaitMinutes} min on average',
      severity: AttentionSeverity.needsAttention,
    ));
  }

  for (final mode in ['TAKEAWAY', 'DINE_IN', 'DRIVE_IN']) {
    final waiting = waitingForMode(queues, mode);
    final info = ServiceModeInfo.forMode(mode);
    if (waiting >= 8) {
      items.add(AttentionItem(
        message: '${info.label} line is getting busy — $waiting ${info.waitingLabel}',
        severity: AttentionSeverity.worthChecking,
      ));
    }
  }

  final paused = queues.where((q) => q.isPaused).toList();
  for (final q in paused) {
    final info = ServiceModeInfo.forMode(q.serviceMode);
    items.add(AttentionItem(
      message: '${info.label} line is paused',
      severity: AttentionSeverity.needsAttention,
    ));
  }

  if (summary.noShows >= 3) {
    items.add(AttentionItem(
      message: '${summary.noShows} guests missed their turn today',
      severity: summary.noShows >= 5
          ? AttentionSeverity.needsAttention
          : AttentionSeverity.worthChecking,
    ));
  }

  final closed = queues.where((q) => q.isClosed).length;
  if (closed > 0 && queues.length == closed) {
    items.add(const AttentionItem(
      message: 'All waiting lines are closed',
      severity: AttentionSeverity.needsAttention,
    ));
  }

  return items;
}

class CalmNeedsAttention extends StatelessWidget {
  const CalmNeedsAttention({
    required this.queues,
    required this.summary,
    super.key,
  });

  final List<QueueModel> queues;
  final DailySummaryModel summary;

  @override
  Widget build(BuildContext context) {
    final items = buildAttentionItems(queues: queues, summary: summary);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const CalmSectionLabel('Needs your attention'),
        const SizedBox(height: AppSpacing.sm),
        if (items.isEmpty)
          CalmCard(
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: AppColors.success),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'All good — nothing needs your attention right now.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          )
        else
          ...items.take(4).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: CalmCard(
                    highlighted: item.severity == AttentionSeverity.needsAttention,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          item.severity == AttentionSeverity.needsAttention
                              ? Icons.info_outline
                              : Icons.lightbulb_outline,
                          color: AppColors.calmViolet,
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            item.message,
                            style: Theme.of(context).textTheme.bodyMedium,
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
