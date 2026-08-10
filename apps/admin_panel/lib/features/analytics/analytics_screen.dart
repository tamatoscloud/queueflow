import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../core/network/platform_api_client.dart';
import '../../shared/widgets/calm/calm_card.dart';
import '../../shared/widgets/calm/calm_empty_state.dart';
import '../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../shared/widgets/calm/calm_section_label.dart';
import '../../shared/widgets/calm/calm_stat_row.dart';

final analyticsProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(platformApiClientProvider).getAnalytics();
});

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(analyticsProvider);
    final isWide = Breakpoints.isTablet(context);

    return async.when(
      loading: () => const CalmPageScaffold(isLoading: true, title: 'Analytics'),
      error: (_, __) => CalmPageScaffold(
        title: 'Analytics',
        errorMessage: 'We couldn\'t load platform analytics.',
        onRetry: () => ref.invalidate(analyticsProvider),
      ),
      data: (data) => CalmPageScaffold(
        title: 'Analytics',
        subtitle: 'Real platform metrics only',
        onRefresh: () async => ref.invalidate(analyticsProvider),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CalmSectionLabel('Platform activity'),
            const SizedBox(height: AppSpacing.sm),
            GridView.count(
              crossAxisCount: isWide ? 3 : 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.sm,
              childAspectRatio: isWide ? 1.8 : 1.5,
              children: [
                CalmStatRow(label: 'New businesses', value: '${data.businessGrowth}'),
                CalmStatRow(label: 'Average wait', value: '${data.averageWaitMinutes.toStringAsFixed(1)} min'),
                CalmStatRow(
                  label: 'Peak hours',
                  value: data.peakHoursNote?.trim().isNotEmpty == true ? 'Available' : '—',
                  subtitle: data.peakHoursNote ?? 'Not available yet',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            const CalmSectionLabel('Queue entry status'),
            const SizedBox(height: AppSpacing.sm),
            if (data.dailyCustomers.isEmpty)
              const CalmEmptyState(
                title: 'Not available yet',
                message: 'Queue entry breakdown will appear when enough activity is recorded.',
                icon: Icons.bar_chart_outlined,
              )
            else
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final row in data.dailyCustomers)
                    CalmCard(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Text(_formatStatusCount(row)),
                    ),
                ],
              ),
            const SizedBox(height: AppSpacing.lg),
            const CalmSectionLabel('Notifications'),
            const SizedBox(height: AppSpacing.sm),
            if (data.notificationSuccess.isEmpty)
              const CalmCard(child: Text('Not available yet'))
            else
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final row in data.notificationSuccess)
                    CalmCard(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Text(_formatStatusCount(row)),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

String _formatStatusCount(Map<String, dynamic> row) {
  final countMap = row['_count'];
  final total = countMap is Map<String, dynamic> ? countMap['_all'] ?? 0 : 0;
  return '${row['status']}: $total';
}
