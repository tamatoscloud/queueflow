import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

class CalmStatusBadge extends StatelessWidget {
  const CalmStatusBadge({super.key, required this.label, required this.status});

  final String label;
  final CalmEntryStatus status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      CalmEntryStatus.waiting => (AppColors.calmLilac, AppColors.calmCharcoal),
      CalmEntryStatus.called => (AppColors.calmPeach, AppColors.calmCharcoal),
      CalmEntryStatus.hold => (AppColors.warningLight, AppColors.warning),
      CalmEntryStatus.ready => (AppColors.successLight, AppColors.success),
      CalmEntryStatus.completed => (AppColors.neutral100, AppColors.calmWarmGray),
      CalmEntryStatus.noShow => (AppColors.dangerLight, AppColors.danger),
      CalmEntryStatus.cancelled => (AppColors.neutral100, AppColors.calmWarmGray),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.6,
            ),
      ),
    );
  }
}

enum CalmEntryStatus { waiting, called, hold, ready, completed, noShow, cancelled }

CalmEntryStatus calmStatusFromEntry(String status) => switch (status) {
      'CALLED' => CalmEntryStatus.called,
      'HOLDING' => CalmEntryStatus.hold,
      'WAITING' => CalmEntryStatus.waiting,
      'COMPLETED' => CalmEntryStatus.completed,
      'NO_SHOW' => CalmEntryStatus.noShow,
      'CANCELLED' => CalmEntryStatus.cancelled,
      'SKIPPED' => CalmEntryStatus.noShow,
      _ => CalmEntryStatus.waiting,
    };

String calmStatusLabel(String status, String serviceMode) => switch (status) {
      'CALLED' => serviceMode == 'TAKEAWAY' ? 'READY' : 'CALLED',
      'HOLDING' => 'ON HOLD',
      'WAITING' => 'WAITING',
      'COMPLETED' => serviceMode == 'TAKEAWAY' ? 'COLLECTED' : 'DONE',
      'NO_SHOW' => 'NO SHOW',
      'CANCELLED' => 'CANCELLED',
      'SKIPPED' => 'NO SHOW',
      _ => status,
    };
