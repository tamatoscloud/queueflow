import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/calm/admin_calm_helpers.dart';
import '../../shared/widgets/calm/calm_health_row.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../../shared/widgets/calm/calm_status_dot.dart';

final systemHealthProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(platformApiClientProvider).getSystemHealth();
});

class HealthScreen extends ConsumerWidget {
  const HealthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(systemHealthProvider);

    return async.when(
      loading: () => const CalmPageScaffold(isLoading: true, title: 'Health'),
      error: (_, __) => CalmPageScaffold(
        title: 'Health',
        errorMessage: 'We couldn\'t load platform health.',
        onRetry: () => ref.invalidate(systemHealthProvider),
      ),
      data: (health) {
        final issues = health.entries.where((e) => calmHealthStatus(e.value) != CalmPlatformStatus.healthy).length;
        final overall = issues == 0 ? CalmPlatformStatus.healthy : CalmPlatformStatus.needsAttention;

        return CalmPageScaffold(
          title: 'Health',
          subtitle: 'Platform service status',
          onRefresh: () async => ref.invalidate(systemHealthProvider),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Platform health', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: AppSpacing.sm),
              CalmStatusDot(
                status: overall,
                label: issues == 0 ? 'All systems operational' : '$issues service${issues == 1 ? '' : 's'} need attention',
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Services'),
              const SizedBox(height: AppSpacing.sm),
              ...health.entries.map((entry) {
                final status = calmHealthStatus(entry.value);
                final details = entry.value is Map
                    ? (entry.value as Map).entries.map((e) => '${e.key}: ${e.value}').join('\n')
                    : entry.value.toString();
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: CalmHealthRow(
                    name: calmHealthKeyLabel(entry.key),
                    status: status,
                    summary: _summaryFor(entry.key, entry.value, status),
                    technicalDetails: details,
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  String _summaryFor(String key, dynamic value, CalmPlatformStatus status) {
    if (status == CalmPlatformStatus.healthy) return calmStatusDescription(status);
    if (key == 'notificationQueue') return 'Some notification deliveries may be failing.';
    if (key == 'socketIo') return 'Realtime updates may be delayed.';
    return calmStatusDescription(status);
  }
}
