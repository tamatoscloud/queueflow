import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/queue_entry_model.dart';
import 'calm_card.dart';
import 'calm_entry_helpers.dart';
import 'calm_primary_button.dart';
import 'calm_section_label.dart';
import 'calm_status_badge.dart';

class CalmQueueEntryCard extends StatelessWidget {
  const CalmQueueEntryCard({
    required this.entry,
    required this.serviceMode,
    super.key,
    this.isNextUp = false,
    this.compact = false,
    this.onTap,
    this.onCall,
    this.onComplete,
    this.onHold,
    this.onSkip,
    this.onRecall,
    this.onResume,
  });

  final QueueEntryModel entry;
  final String serviceMode;
  final bool isNextUp;
  final bool compact;
  final VoidCallback? onTap;
  final VoidCallback? onCall;
  final VoidCallback? onComplete;
  final VoidCallback? onHold;
  final VoidCallback? onSkip;
  final VoidCallback? onRecall;
  final VoidCallback? onResume;

  @override
  Widget build(BuildContext context) {
    final statusLabel = calmStatusLabel(entry.status, serviceMode);

    return CalmCard(
      highlighted: isNextUp,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isNextUp) ...[
            const CalmSectionLabel('Next up'),
            const SizedBox(height: AppSpacing.sm),
          ],
          Row(
            children: [
              Text(
                entry.displayCode,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.calmViolet,
                    ),
              ),
              const Spacer(),
              CalmStatusBadge(label: statusLabel, status: calmStatusFromEntry(entry.status)),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            calmEntryTitle(entry, serviceMode),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.calmCharcoal,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            calmEntrySubtitle(entry, serviceMode),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
          ),
          const SizedBox(height: 6),
          Text(
            '${entry.status == 'CALLED' ? 'Called' : 'Waiting'} · ${calmWaitLabel(entry)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.calmWarmGray,
                  fontWeight: FontWeight.w500,
                ),
          ),
          if (!compact && _hasActions) ...[
            const SizedBox(height: AppSpacing.md),
            _buildActions(context),
          ],
        ],
      ),
    );
  }

  bool get _hasActions =>
      onCall != null || onComplete != null || onHold != null || onSkip != null || onRecall != null || onResume != null;

  Widget _buildActions(BuildContext context) {
    if (onCall != null) {
      return CalmPrimaryButton(label: 'Call next', icon: Icons.campaign_outlined, onPressed: onCall);
    }
    if (onComplete != null) {
      return CalmPrimaryButton(
        label: serviceMode == 'TAKEAWAY' ? 'Mark collected' : 'Complete',
        icon: Icons.check_circle_outline,
        variant: CalmPrimaryVariant.success,
        onPressed: onComplete,
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (onRecall != null)
          _chip(context, 'Call again', onRecall!),
        if (onResume != null)
          _chip(context, 'Resume', onResume!),
        if (onHold != null)
          _chip(context, 'Hold', onHold!),
        if (onSkip != null)
          _chip(context, 'Skip', onSkip!),
      ],
    );
  }

  Widget _chip(BuildContext context, String label, VoidCallback onPressed) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.calmCharcoal,
        side: const BorderSide(color: AppColors.calmBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      child: Text(label),
    );
  }
}
