import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/entry_metadata.dart';
import '../../../core/models/queue_entry_model.dart';
import '../staff/service_mode_helpers.dart';
import 'calm_card.dart';
import 'calm_primary_button.dart';
import 'calm_section_label.dart';
import 'calm_status_badge.dart';

int calmWaitMinutes(QueueEntryModel entry) {
  final start = switch (entry.status) {
    'CALLED' || 'HOLDING' => entry.calledAt ?? entry.joinedAt,
    _ => entry.joinedAt,
  };
  if (start == null) return 0;
  return DateTime.now().difference(start).inMinutes;
}

String calmWaitLabel(QueueEntryModel entry) {
  final mins = calmWaitMinutes(entry);
  if (mins < 1) return '<1 min';
  return '$mins min';
}

/// Status-aware time line, e.g. "Called · 3 min" instead of always "Waiting".
String calmElapsedStatusLine(QueueEntryModel entry, {String serviceMode = 'DINE_IN'}) {
  final time = calmWaitLabel(entry);
  return switch (entry.status) {
    'CALLED' => serviceMode == 'TAKEAWAY' ? 'Ready · $time' : 'Called · $time',
    'HOLDING' => 'On hold · $time',
    'COMPLETED' => serviceMode == 'TAKEAWAY'
        ? 'Collected'
        : serviceMode == 'DRIVE_IN'
            ? 'Served'
            : 'Seated',
    'NO_SHOW' || 'SKIPPED' => 'No show',
    'CANCELLED' => 'Cancelled',
    _ => 'Waiting · $time',
  };
}

/// Operational queue card — token, identity, mode context, wait, action.
class CalmQueueEntryCard extends StatelessWidget {
  const CalmQueueEntryCard({
    super.key,
    required this.entry,
    required this.serviceMode,
    this.isNextUp = false,
    this.isSelected = false,
    this.compact = false,
    this.onTap,
    this.onCall,
    this.onSeat,
    this.onHold,
    this.onSkip,
    this.onRecall,
  });

  final QueueEntryModel entry;
  final String serviceMode;
  final bool isNextUp;
  final bool isSelected;
  final bool compact;
  final VoidCallback? onTap;
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
    final status = calmStatusFromEntry(entry.status);

    return CalmCard(
      highlighted: isNextUp || isSelected,
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isNextUp) ...[
            const CalmSectionLabel('NEXT UP'),
            const SizedBox(height: AppSpacing.sm),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.displayCode,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmViolet,
                    ),
              ),
              const Spacer(),
              CalmStatusBadge(label: statusLabel, status: status),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _primaryTitle(meta),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.calmCharcoal,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            _secondaryLine(meta),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.calmWarmGray,
                ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                calmElapsedStatusLine(entry, serviceMode: serviceMode),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.calmWarmGray,
                      fontWeight: FontWeight.w500,
                    ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                modeInfo.label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.calmViolet,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          if (!compact && _hasActions) ...[
            const SizedBox(height: AppSpacing.md),
            _ActionRow(
              serviceMode: serviceMode,
              entry: entry,
              onCall: onCall,
              onSeat: onSeat,
              onHold: onHold,
              onSkip: onSkip,
              onRecall: onRecall,
            ),
          ],
        ],
      ),
    );
  }

  bool get _hasActions =>
      onCall != null || onSeat != null || onHold != null || onSkip != null || onRecall != null;

  String _primaryTitle(EntryMetadata meta) {
    if (serviceMode == 'TAKEAWAY' && meta.orderNumber != null) {
      return 'Order #${meta.orderNumber}';
    }
    return entry.customerName ?? 'Guest';
  }

  String _secondaryLine(EntryMetadata meta) {
    return switch (serviceMode) {
      'TAKEAWAY' => entry.customerName != null ? entry.customerName! : 'Pickup',
      'DRIVE_IN' => [
          meta.vehicleDescription,
          meta.vehiclePlate,
        ].where((s) => s != null && s.isNotEmpty).join(' · ').isEmpty
          ? 'Vehicle'
          : [
              meta.vehicleDescription,
              meta.vehiclePlate,
            ].where((s) => s != null && s.isNotEmpty).join(' · '),
      _ => 'Party of ${entry.partySize}',
    };
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.serviceMode,
    required this.entry,
    this.onCall,
    this.onSeat,
    this.onHold,
    this.onSkip,
    this.onRecall,
  });

  final String serviceMode;
  final QueueEntryModel entry;
  final VoidCallback? onCall;
  final VoidCallback? onSeat;
  final VoidCallback? onHold;
  final VoidCallback? onSkip;
  final VoidCallback? onRecall;

  @override
  Widget build(BuildContext context) {
    final modeInfo = ServiceModeInfo.forMode(serviceMode);

    if (onCall != null && entry.status == 'WAITING') {
      return CalmPrimaryButton(
        label: modeInfo.callNextLabel,
        icon: Icons.campaign_outlined,
        onPressed: onCall,
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (onSeat != null)
          SizedBox(
            width: double.infinity,
            child: CalmPrimaryButton(
              label: modeInfo.completeLabel,
              icon: Icons.check_circle_outline,
              variant: CalmPrimaryVariant.success,
              onPressed: onSeat,
            ),
          ),
        if (onRecall != null)
          CalmPrimaryButton(
            label: entry.status == 'HOLDING' ? 'Resume' : 'Call again',
            icon: Icons.replay,
            onPressed: onRecall,
          ),
        if (onHold != null)
          _SecondaryAction(label: 'Hold', icon: Icons.pause_circle_outline, onPressed: onHold),
        if (onSkip != null)
          _SecondaryAction(label: 'No show', icon: Icons.person_off_outlined, onPressed: onSkip),
      ],
    );
  }
}

class _SecondaryAction extends StatelessWidget {
  const _SecondaryAction({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.calmCharcoal,
          side: const BorderSide(color: AppColors.calmBorder),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
    );
  }
}
