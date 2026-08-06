import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/queue_model.dart';
import '../staff/service_mode_helpers.dart';
import 'calm_card.dart';

class CalmServiceModeRow extends StatelessWidget {
  const CalmServiceModeRow({
    super.key,
    required this.label,
    required this.waiting,
    required this.waitingUnit,
    this.onTap,
  });

  final String label;
  final int waiting;
  final String waitingUnit;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.calmCharcoal,
                  ),
            ),
          ),
          Text(
            '$waiting $waitingUnit',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: waiting > 0 ? AppColors.calmCharcoal : AppColors.calmWarmGray,
                ),
          ),
        ],
      ),
    );
  }
}

List<Widget> calmServiceModeRows(
  BuildContext context,
  List<QueueModel> queues, {
  void Function(String mode)? onModeTap,
}) {
  const modes = ['DINE_IN', 'TAKEAWAY', 'DRIVE_IN'];
  final widgets = <Widget>[];

  for (final mode in modes) {
    final info = ServiceModeInfo.forMode(mode);
    final waiting = waitingForMode(queues, mode);
    final hasQueue = queues.any((q) => q.serviceMode == mode);
    if (!hasQueue) continue;

    widgets.add(
      Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: CalmServiceModeRow(
          label: info.label,
          waiting: waiting,
          waitingUnit: waiting > 0 ? info.waitingLabel : info.waitingLabel,
          onTap: onModeTap != null ? () => onModeTap(mode) : null,
        ),
      ),
    );
  }

  return widgets;
}
