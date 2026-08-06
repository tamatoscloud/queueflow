import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

final reportsProvider = FutureProvider.autoDispose((ref) async {
  final api = ref.watch(businessApiClientProvider);
  final businessId = ref.watch(currentUserProvider)?.businessId;
  return api.getDailySummary(businessId: businessId);
});

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(reportsProvider);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(reportsProvider),
        child: async.when(
          loading: () => const PageLoading(message: 'Loading reports…'),
          error: (e, _) => PageError(
            message: apiExceptionMessage(e),
            onRetry: () => ref.invalidate(reportsProvider),
          ),
          data: (summary) {
            if (!summary.hasActivity) {
              return ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: const [
                  EmptyStateView(
                    title: 'No report data yet',
                    message: 'Reports will appear once your queues have activity today.',
                    icon: Icons.bar_chart_outlined,
                  ),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                CalmSectionLabel(
                  'Today',
                  subtitle: summary.date.isNotEmpty ? summary.date : 'Your restaurant today',
                ),
                const SizedBox(height: AppSpacing.md),
                CalmCard(
                  highlighted: true,
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    children: [
                      _ReportRow(label: 'Served', value: '${summary.totalServed}'),
                      const Divider(height: 24),
                      _ReportRow(label: 'No-shows', value: '${summary.noShows}'),
                      const Divider(height: 24),
                      _ReportRow(
                        label: 'Average wait',
                        value: summary.averageWaitMinutes > 0
                            ? '~${summary.averageWaitMinutes} min'
                            : 'Not enough data yet',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                CalmCard(
                  child: Text(
                    'More reports will appear as more data becomes available. Weekly and monthly views are not available yet.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.calmWarmGray,
                        ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ReportRow extends StatelessWidget {
  const _ReportRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodyLarge),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.calmCharcoal,
              ),
        ),
      ],
    );
  }
}
