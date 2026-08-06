import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../core/realtime/realtime_client.dart';

class RealtimeStatusChip extends ConsumerWidget {
  const RealtimeStatusChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(realtimeStatusProvider);
    return status.when(
      data: (s) {
        final (variant, label, icon) = switch (s) {
          RealtimeStatus.connected => (
              AppBadgeVariant.success,
              'Live',
              Icons.circle,
            ),
          RealtimeStatus.connecting => (
              AppBadgeVariant.warning,
              'Connecting',
              Icons.sync,
            ),
          RealtimeStatus.reconnecting => (
              AppBadgeVariant.warning,
              'Reconnecting',
              Icons.sync,
            ),
          RealtimeStatus.disconnected => (
              AppBadgeVariant.neutral,
              'Offline',
              Icons.cloud_off_outlined,
            ),
        };
        return AppBadge(label: label, variant: variant, icon: icon);
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class BranchSwitcher extends ConsumerWidget {
  const BranchSwitcher({
    super.key,
    required this.branches,
    required this.selectedId,
    required this.onChanged,
  });

  final List<({String id, String name})> branches;
  final String? selectedId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (branches.isEmpty) return const SizedBox.shrink();

    final brightness = Theme.of(context).brightness;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
        boxShadow: AppShadows.sm(brightness),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String?>(
          value: selectedId,
          hint: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.store_outlined, size: 18, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                'All branches',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          icon: Icon(Icons.expand_more, color: AppColors.primary, size: 20),
          borderRadius: AppRadius.lgAll,
          items: [
            DropdownMenuItem(
              value: null,
              child: Row(
                children: [
                  Icon(Icons.hub_outlined, size: 18, color: AppColors.neutral500),
                  const SizedBox(width: 8),
                  const Text('All branches'),
                ],
              ),
            ),
            ...branches.map(
              (b) => DropdownMenuItem(
                value: b.id,
                child: Row(
                  children: [
                    Icon(Icons.store_outlined, size: 18, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Text(b.name),
                  ],
                ),
              ),
            ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// Legacy stat card — prefer [MetricCard] from queueflow_widgets for new screens.
class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, this.icon});

  final String label;
  final String value;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null)
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: AppRadius.lgAll,
              ),
              child: Icon(icon, color: AppColors.primary, size: 20),
            ),
          if (icon != null) const SizedBox(height: AppSpacing.sm),
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}
