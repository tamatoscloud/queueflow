import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/entry_metadata.dart';
import '../../../core/models/queue_entry_model.dart';
import 'service_mode_helpers.dart';

class StaffQueueEntryCard extends StatelessWidget {
  const StaffQueueEntryCard({
    super.key,
    required this.entry,
    required this.position,
    this.serviceMode = 'DINE_IN',
    this.onCall,
    this.onHold,
    this.onSeat,
    this.onSkip,
    this.onRecall,
    this.compact = false,
  });

  final QueueEntryModel entry;
  final int position;
  final String serviceMode;
  final VoidCallback? onCall;
  final VoidCallback? onHold;
  final VoidCallback? onSeat;
  final VoidCallback? onSkip;
  final VoidCallback? onRecall;
  final bool compact;

  String _waitLabel() {
    final start = entry.joinedAt;
    if (start == null) return '—';
    final mins = DateTime.now().difference(start).inMinutes;
    if (mins < 1) return '<1 min';
    return '$mins min';
  }

  Color _statusColor() => switch (entry.status) {
        'CALLED' => AppColors.secondary,
        'HOLDING' => AppColors.warning,
        'WAITING' => AppColors.primary,
        'NO_SHOW' => AppColors.danger,
        'COMPLETED' => AppColors.success,
        _ => AppColors.neutral500,
      };

  String _statusLabel() => switch (entry.status) {
        'CALLED' => serviceMode == 'TAKEAWAY' ? 'READY' : 'CALLED',
        'HOLDING' => 'HELD',
        'WAITING' => 'WAITING',
        'NO_SHOW' => 'NO SHOW',
        'COMPLETED' => 'DONE',
        'CANCELLED' => 'CANCELLED',
        _ => entry.status,
      };

  EntryMetadata get _meta =>
      EntryMetadata.fromJson(entry.metadata, notes: entry.notes);

  @override
  Widget build(BuildContext context) {
    final accent = _statusColor();
    final isCalled = entry.status == 'CALLED';
    final modeInfo = ServiceModeInfo.forMode(serviceMode);
    final meta = _meta;

    return AppCard(
      variant: isCalled ? AppCardVariant.gradient : AppCardVariant.elevated,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isCalled ? Colors.white.withValues(alpha: 0.2) : accent.withValues(alpha: 0.12),
                  borderRadius: AppRadius.mdAll,
                ),
                child: Text(
                  entry.displayCode,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: isCalled ? Colors.white : accent,
                      ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.customerName ?? 'Guest',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: isCalled ? Colors.white : null,
                          ),
                    ),
                    if (serviceMode == 'TAKEAWAY' && meta.orderNumber != null)
                      Text(
                        'Order #${meta.orderNumber}',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: isCalled ? Colors.white.withValues(alpha: 0.95) : AppColors.warning,
                            ),
                      )
                    else if (serviceMode == 'DINE_IN')
                      Text(
                        'Party of ${entry.partySize}',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: isCalled ? Colors.white.withValues(alpha: 0.95) : null,
                            ),
                      )
                    else if (serviceMode == 'DRIVE_IN' && meta.vehicleDescription != null)
                      Text(
                        meta.vehicleDescription!,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: isCalled ? Colors.white.withValues(alpha: 0.95) : null,
                            ),
                      ),
                  ],
                ),
              ),
              StatusBadge(status: _statusLabel()),
            ],
          ),
          if (!compact) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (serviceMode == 'DRIVE_IN' && meta.vehiclePlate != null)
                  _MetaChip(
                    icon: Icons.directions_car_outlined,
                    label: meta.vehiclePlate!,
                    light: isCalled,
                  ),
                if (serviceMode == 'DRIVE_IN' && meta.vehiclePlate != null)
                  const SizedBox(width: AppSpacing.sm),
                if (serviceMode == 'TAKEAWAY')
                  _MetaChip(icon: Icons.shopping_bag_outlined, label: 'Pickup', light: isCalled),
                if (serviceMode == 'DINE_IN')
                  _MetaChip(
                    icon: Icons.people_outline,
                    label: 'Party of ${entry.partySize}',
                    light: isCalled,
                  ),
                if (serviceMode == 'DRIVE_IN' && entry.partySize > 0)
                  _MetaChip(
                    icon: Icons.people_outline,
                    label: '${entry.partySize} in vehicle',
                    light: isCalled,
                  ),
                const SizedBox(width: AppSpacing.sm),
                _MetaChip(
                  icon: Icons.timer_outlined,
                  label: 'Waiting ${_waitLabel()}',
                  light: isCalled,
                ),
              ],
            ),
          ],
          if (onCall != null || onHold != null || onSeat != null || onSkip != null || onRecall != null) ...[
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (onCall != null)
                  AppButton(
                    label: modeInfo.callNextLabel,
                    icon: Icons.campaign_outlined,
                    size: AppButtonSize.sm,
                    onPressed: onCall,
                  ),
                if (onSeat != null)
                  AppButton(
                    label: modeInfo.completeLabel,
                    icon: Icons.check,
                    size: AppButtonSize.sm,
                    variant: AppButtonVariant.primary,
                    onPressed: onSeat,
                  ),
                if (onHold != null)
                  AppButton(label: 'Hold', icon: Icons.pause, size: AppButtonSize.sm, variant: AppButtonVariant.secondary, onPressed: onHold),
                if (onRecall != null)
                  AppButton(label: 'Recall', icon: Icons.replay, size: AppButtonSize.sm, variant: AppButtonVariant.outline, onPressed: onRecall),
                if (onSkip != null)
                  AppButton(label: 'Skip', icon: Icons.skip_next, size: AppButtonSize.sm, variant: AppButtonVariant.danger, onPressed: onSkip),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label, this.light = false});

  final IconData icon;
  final String label;
  final bool light;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: light ? Colors.white70 : AppColors.neutral500),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: light ? Colors.white70 : AppColors.neutral600,
                fontWeight: FontWeight.w500,
              ),
        ),
      ],
    );
  }
}
