import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/skeleton_loaders.dart';
import 'widgets/calm_avg_wait_card.dart';
import 'widgets/calm_live_activity.dart';
import 'widgets/calm_needs_attention.dart';
import 'widgets/calm_owner_header.dart';
import 'widgets/calm_quick_actions.dart';
import 'widgets/calm_service_mode_overview.dart';
import 'widgets/calm_waiting_now.dart';
import 'widgets/owner_quick_actions.dart';
import 'widgets/service_performance_panel.dart';

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) {
    return (
      queues: <QueueModel>[],
      summary: const DailySummaryModel(
        date: '',
        totalServed: 0,
        averageWaitMinutes: 0,
        noShows: 0,
      ),
      notifications: <NotificationModel>[],
      waiting: 0,
      businessName: 'Your restaurant',
    );
  }
  final api = ref.watch(businessApiClientProvider);
  final user = auth.session?.user;
  final branchId = ref.watch(selectedBranchIdProvider);
  final businessId = user?.businessId;
  try {
    final queues = await api.getQueues(branchId: branchId, businessId: businessId);
    final summary = await api.getDailySummary(businessId: businessId);
    final notifications = await api.getNotifications();
    final waiting = queues.fold<int>(0, (sum, q) => sum + q.waitingCount);
    final business = businessId != null ? await api.getBusiness(businessId) : null;
    return (
      queues: queues,
      summary: summary,
      notifications: notifications,
      waiting: waiting,
      businessName: business?['name'] as String? ?? 'Your restaurant',
    );
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final dashboardRealtimeBindingProvider = Provider.autoDispose<void>((ref) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;

  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () => ref.invalidate(dashboardProvider),
    onSubscribe: () async {
      await client.connect();
      final dash = await client.subscribeBusinessDashboard(businessId);
      final queues = await client.subscribeBusinessQueues(businessId);
      return dash && queues;
    },
  );
});

String _connectionLabel(AsyncValue<RealtimeStatus> status) {
  return status.when(
    data: (s) => switch (s) {
      RealtimeStatus.connected => 'Live',
      RealtimeStatus.connecting => 'Updating…',
      RealtimeStatus.reconnecting => 'Updating…',
      RealtimeStatus.disconnected => 'Updating…',
    },
    loading: () => 'Updating…',
    error: (_, __) => 'Updating…',
  );
}

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dashboardRealtimeBindingProvider);
    final async = ref.watch(dashboardProvider);
    final realtimeStatus = ref.watch(realtimeStatusProvider);
    final user = ref.watch(currentUserProvider);
    final isTablet = Breakpoints.isTablet(context);
    final connectionLabel = _connectionLabel(realtimeStatus);

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      floatingActionButton: const OwnerQuickActionsFab(),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: async.when(
          loading: () => const DashboardSkeleton(),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'We couldn\'t load your restaurant data.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  FilledButton(
                    onPressed: () => ref.invalidate(dashboardProvider),
                    child: const Text('Try again'),
                  ),
                ],
              ),
            ),
          ),
          data: (data) {
            final leftColumn = [
              CalmOwnerHeader(
                ownerName: user?.fullName ?? 'there',
                businessName: data.businessName,
                waiting: data.waiting,
                summary: data.summary,
                queues: data.queues,
                connectionLabel: connectionLabel,
              ),
              const SizedBox(height: AppSpacing.lg),
              CalmWaitingNow(queues: data.queues),
              const SizedBox(height: AppSpacing.lg),
              CalmAvgWaitCard(summary: data.summary),
              const SizedBox(height: AppSpacing.lg),
              CalmNeedsAttention(queues: data.queues, summary: data.summary),
            ];

            final rightColumn = [
              CalmServiceModeOverview(queues: data.queues),
              const SizedBox(height: AppSpacing.lg),
              ServicePerformancePanel(queues: data.queues),
              const SizedBox(height: AppSpacing.lg),
              CalmLiveActivity(notifications: data.notifications),
              const SizedBox(height: AppSpacing.lg),
              const CalmQuickActions(),
            ];

            return ListView(
              padding: EdgeInsets.all(isTablet ? AppSpacing.lg : AppSpacing.md),
              children: [
                if (isTablet)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Column(children: leftColumn)),
                      const SizedBox(width: AppSpacing.lg),
                      Expanded(child: Column(children: rightColumn)),
                    ],
                  )
                else
                  ...leftColumn,
                if (!isTablet) ...rightColumn,
              ],
            );
          },
        ),
      ),
    );
  }
}
