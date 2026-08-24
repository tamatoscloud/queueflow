import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/entry_metadata.dart';
import '../../../core/models/queue_entry_model.dart';
import '../staff/service_mode_helpers.dart';
import '../staff/staff_queue_timeline.dart';
import 'calm_card.dart';
import 'calm_live_indicator.dart';
import 'calm_primary_button.dart';
import 'calm_queue_entry_card.dart';
import 'calm_section_label.dart';
import 'calm_status_badge.dart';

class CalmQueueConsoleHeader extends StatelessWidget {
  const CalmQueueConsoleHeader({
    super.key,
    required this.queueName,
    required this.serviceMode,
    required this.waitingCount,
    required this.liveLabel,
    this.waitingUnit,
  });

  final String queueName;
  final String serviceMode;
  final int waitingCount;
  final String liveLabel;
  final String? waitingUnit;

  @override
  Widget build(BuildContext context) {
    final modeInfo = ServiceModeInfo.forMode(serviceMode);
    final unit = waitingUnit ?? modeInfo.waitingLabel;

    return CalmCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  queueName,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.calmCharcoal,
                      ),
                ),
              ),
              CalmLiveIndicator(label: liveLabel),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            modeInfo.label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.calmWarmGray,
                  fontWeight: FontWeight.w500,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '$waitingCount $unit waiting',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.calmCharcoal,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class CalmQueueDetailPanel extends StatelessWidget {
  const CalmQueueDetailPanel({
    super.key,
    required this.entry,
    required this.serviceMode,
    required this.onCall,
    required this.onSeat,
    required this.onHold,
    required this.onSkip,
    required this.onRecall,
  });

  final QueueEntryModel entry;
  final String serviceMode;
  final VoidCallback? onCall;
  final VoidCallback? onSeat;
  final VoidCallback? onHold;
  final VoidCallback? onSkip;
  final VoidCallback? onRecall;

  @override
  Widget build(BuildContext context) {
    final modeInfo = ServiceModeInfo.forMode(serviceMode);
    final meta = EntryMetadata.fromJson(entry.metadata, notes: entry.notes);
    final statusLabel = calmStatusLabel(entry.status, serviceMode);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          entry.customerName ?? 'Guest',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.calmCharcoal,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          entry.displayCode,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.calmViolet,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        CalmStatusBadge(
          label: statusLabel,
          status: calmStatusFromEntry(entry.status),
        ),
        const SizedBox(height: AppSpacing.md),
        _DetailRow(label: 'Service', value: modeInfo.label),
        _DetailRow(
          label: 'Status',
          value: calmElapsedStatusLine(entry, serviceMode: serviceMode),
        ),
        if (serviceMode == 'DINE_IN')
          _DetailRow(label: 'Party', value: '${entry.partySize}'),
        if (serviceMode == 'TAKEAWAY' && meta.orderNumber != null)
          _DetailRow(label: 'Order', value: '#${meta.orderNumber}'),
        if (serviceMode == 'DRIVE_IN' && meta.vehicleDescription != null)
          _DetailRow(label: 'Vehicle', value: meta.vehicleDescription!),
        if (serviceMode == 'DRIVE_IN' && meta.vehiclePlate != null)
          _DetailRow(label: 'Plate', value: meta.vehiclePlate!),
        if (entry.customerPhone != null && entry.customerPhone!.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          const CalmSectionLabel('CONTACT'),
          const SizedBox(height: AppSpacing.sm),
          _DetailRow(label: 'Phone', value: entry.customerPhone!),
        ],
        const SizedBox(height: AppSpacing.lg),
        const CalmSectionLabel('TIMELINE'),
        const SizedBox(height: AppSpacing.sm),
        _CalmVerticalTimeline(entry: entry),
        const Spacer(),
        const SizedBox(height: AppSpacing.md),
        if (entry.status == 'WAITING' && onCall != null)
          CalmPrimaryButton(
            label: modeInfo.callNextLabel,
            icon: Icons.campaign_outlined,
            onPressed: onCall,
          ),
        if (entry.status == 'CALLED' && onSeat != null) ...[
          CalmPrimaryButton(
            label: modeInfo.completeLabel,
            icon: Icons.check_circle_outline,
            variant: CalmPrimaryVariant.success,
            onPressed: onSeat,
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (entry.status == 'CALLED' && onRecall != null)
          CalmPrimaryButton(
            label: 'Call again',
            icon: Icons.replay,
            onPressed: onRecall,
          ),
        if (onHold != null && entry.status != 'HOLDING') ...[
          const SizedBox(height: AppSpacing.sm),
          AppButton(
            label: 'Hold',
            icon: Icons.pause_circle_outline,
            variant: AppButtonVariant.secondary,
            fullWidth: true,
            onPressed: onHold,
          ),
        ],
        if (entry.status == 'HOLDING' && onRecall != null) ...[
          AppButton(
            label: 'Resume',
            icon: Icons.play_arrow,
            variant: AppButtonVariant.secondary,
            fullWidth: true,
            onPressed: onRecall,
          ),
        ],
        if (onSkip != null && entry.status != 'COMPLETED') ...[
          const SizedBox(height: AppSpacing.sm),
          AppButton(
            label: 'No show',
            icon: Icons.person_off_outlined,
            variant: AppButtonVariant.danger,
            fullWidth: true,
            onPressed: onSkip,
          ),
        ],
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.calmCharcoal,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CalmVerticalTimeline extends StatelessWidget {
  const _CalmVerticalTimeline({required this.entry});

  final QueueEntryModel entry;

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat.jm();
    final joined = entry.joinedAt != null ? timeFormat.format(entry.joinedAt!) : '—';
    final called = entry.calledAt != null ? timeFormat.format(entry.calledAt!) : null;
    final step = staffJourneyFromStatus(entry.status, position: entry.position);

    final steps = <(String, String)>[
      ('Joined', joined),
      ('Confirmed', joined),
      ('Waiting', joined),
      if (called != null) ('Called', called),
      if (step == StaffQueueJourneyStep.seated || step == StaffQueueJourneyStep.completed)
        ('Seated', called ?? joined),
    ];

    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: i == steps.length - 1 ? AppColors.calmViolet : AppColors.calmLilac,
                      shape: BoxShape.circle,
                    ),
                  ),
                  if (i < steps.length - 1)
                    Container(width: 2, height: 24, color: AppColors.calmBorder),
                ],
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    children: [
                      Text(
                        steps[i].$1,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppColors.calmCharcoal,
                            ),
                      ),
                      const Spacer(),
                      Text(
                        steps[i].$2,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.calmWarmGray,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class CalmQueueStickyAction extends StatelessWidget {
  const CalmQueueStickyAction({
    super.key,
    required this.waitingCount,
    required this.actionLabel,
    required this.onPressed,
    this.waitingUnit = 'waiting',
  });

  final int waitingCount;
  final String actionLabel;
  final VoidCallback? onPressed;
  final String waitingUnit;

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        // Decorative fade must not steal taps from SEAT / Call again above.
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.calmIvory.withValues(alpha: 0),
                    AppColors.calmIvory,
                  ],
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  waitingUnit.isEmpty
                      ? (waitingCount == 0 ? 'Queue clear' : '$waitingCount')
                      : '$waitingCount $waitingUnit',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.calmWarmGray,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                CalmPrimaryButton(
                  label: actionLabel,
                  icon: Icons.campaign_outlined,
                  onPressed: onPressed,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class CalmQueueSkeleton extends StatelessWidget {
  const CalmQueueSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          _SkeletonCard(height: 88),
          SizedBox(height: AppSpacing.md),
          _SkeletonCard(height: 140),
          SizedBox(height: AppSpacing.sm),
          _SkeletonCard(height: 140),
          SizedBox(height: AppSpacing.sm),
          _SkeletonCard(height: 140),
        ],
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.calmLilac.withValues(alpha: 0.35),
        borderRadius: AppRadius.lgAll,
      ),
    );
  }
}

class CalmQueueCaughtUp extends StatelessWidget {
  const CalmQueueCaughtUp({super.key, this.onAddCustomer});

  final VoidCallback? onAddCustomer;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline, size: 48, color: AppColors.calmViolet),
          const SizedBox(height: AppSpacing.md),
          Text(
            "You're all caught up",
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.calmCharcoal,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'No one is waiting right now.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
          ),
          if (onAddCustomer != null) ...[
            const SizedBox(height: AppSpacing.lg),
            CalmPrimaryButton(
              label: 'Add customer',
              icon: Icons.person_add_outlined,
              onPressed: onAddCustomer,
            ),
          ],
        ],
      ),
    );
  }
}
