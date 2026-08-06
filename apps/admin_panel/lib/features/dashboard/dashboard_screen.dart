import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/network/platform_api_client.dart';
import '../../../core/routing/app_routes.dart';
import '../../../shared/widgets/calm/admin_calm_helpers.dart';
import '../../../shared/widgets/calm/calm_attention_card.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_health_row.dart';
import '../../../shared/widgets/calm/calm_page_scaffold.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/calm/calm_stat_row.dart';
import '../../../shared/widgets/calm/calm_status_dot.dart';

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(platformApiClientProvider).getDashboard();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);
    final isWide = Breakpoints.isTablet(context);

    return async.when(
      loading: () => const CalmPageScaffold(isLoading: true, title: 'Overview'),
      error: (e, _) => CalmPageScaffold(
        title: 'Overview',
        errorMessage: 'We couldn\'t load the platform overview.',
        onRetry: () => ref.invalidate(dashboardProvider),
      ),
      data: (data) {
        final kpis = data.kpis;
        final healthIssues = data.systemHealth.entries
            .where((e) => calmHealthStatus(e.value) != CalmPlatformStatus.healthy)
            .length;
        final overallHealthy = healthIssues == 0 && kpis.failedNotifications == 0;

        return CalmPageScaffold(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                calmGreeting(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.calmWarmGray),
              ),
              const SizedBox(height: 4),
              Text(
                'QueueFlow Platform',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppSpacing.sm),
              CalmStatusDot(
                status: overallHealthy ? CalmPlatformStatus.healthy : CalmPlatformStatus.needsAttention,
                label: overallHealthy
                    ? 'All systems operational'
                    : '$healthIssues service${healthIssues == 1 ? '' : 's'} need attention',
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Platform health'),
              const SizedBox(height: AppSpacing.sm),
              ...data.systemHealth.entries.map((e) {
                final status = calmHealthStatus(e.value);
                final details = e.value is Map
                    ? (e.value as Map).entries.map((x) => '${x.key}: ${x.value}').join('\n')
                    : e.value.toString();
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: CalmHealthRow(
                    name: calmHealthKeyLabel(e.key),
                    status: status,
                    summary: calmStatusDescription(status),
                    technicalDetails: details,
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Needs attention'),
              const SizedBox(height: AppSpacing.sm),
              if (kpis.failedNotifications > 0)
                CalmAttentionCard(
                  title: 'Notification delivery',
                  message: '${kpis.failedNotifications} message${kpis.failedNotifications == 1 ? '' : 's'} failed',
                  detail: 'Some customers may not receive updates.',
                  actionLabel: 'View alerts',
                  onAction: () => context.push(AppRoutes.notifications),
                )
              else if (healthIssues > 0)
                CalmAttentionCard(
                  title: 'Platform services',
                  message: '$healthIssues service${healthIssues == 1 ? '' : 's'} need review',
                  detail: 'Check health details to investigate.',
                  actionLabel: 'View health',
                  onAction: () => context.push(AppRoutes.health),
                )
              else
                CalmCard(
                  child: Text(
                    'Everything looks good.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
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
                  CalmStatRow(label: 'Active businesses', value: '${kpis.businesses}'),
                  CalmStatRow(label: 'Queues live', value: '${kpis.activeQueues}'),
                  CalmStatRow(label: 'Customers served today', value: '${kpis.customersServedToday}'),
                  CalmStatRow(label: 'Notifications sent', value: '${kpis.notificationsSent}'),
                  CalmStatRow(label: 'Active branches', value: '${kpis.activeBranches}'),
                  CalmStatRow(
                    label: 'Failed notifications',
                    value: '${kpis.failedNotifications}',
                    subtitle: kpis.failedNotifications > 0 ? 'Needs review' : null,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const CalmSectionLabel('Quick actions'),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  CalmPrimaryButton(
                    label: 'Businesses',
                    icon: Icons.business_outlined,
                    onPressed: () => context.push(AppRoutes.tenants),
                    compact: true,
                    variant: CalmPrimaryVariant.outline,
                  ),
                  CalmPrimaryButton(
                    label: 'Support',
                    icon: Icons.support_agent_outlined,
                    onPressed: () => context.push(AppRoutes.support),
                    compact: true,
                    variant: CalmPrimaryVariant.outline,
                  ),
                  CalmPrimaryButton(
                    label: 'Analytics',
                    icon: Icons.analytics_outlined,
                    onPressed: () => context.push(AppRoutes.analytics),
                    compact: true,
                    variant: CalmPrimaryVariant.outline,
                  ),
                ],
              ),
              if (kpis.revenueMrr == null) ...[
                const SizedBox(height: AppSpacing.lg),
                CalmCard(
                  child: Text(
                    kpis.revenueNote ?? 'Billing integration is not connected yet.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
