import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/models/queue_model.dart';
import '../../../core/network/api_error_message.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/common_widgets.dart';

final staffQueuesProvider = FutureProvider.autoDispose((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return <QueueModel>[];
  final api = ref.watch(businessApiClientProvider);
  final user = auth.session?.user;
  final branchId = ref.watch(selectedBranchIdProvider);
  try {
    return api.getQueues(branchId: branchId, businessId: user?.businessId);
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final staffHomeRealtimeProvider = Provider.autoDispose<void>((ref) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;

  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () => ref.invalidate(staffQueuesProvider),
    onSubscribe: () async {
      await client.connect();
      return client.subscribeBusinessQueues(businessId);
    },
  );
});

/// Staff-first home — today's queues with one-tap console access.
class StaffHomeScreen extends ConsumerWidget {
  const StaffHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(staffHomeRealtimeProvider);
    final async = ref.watch(staffQueuesProvider);
    final product = productThemeFor(context);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(staffQueuesProvider),
      child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(AppSpacing.md),
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: product.gradient,
                  borderRadius: AppRadius.xxlAll,
                  boxShadow: AppShadows.md(Theme.of(context).brightness),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: AppRadius.fullAll,
                          ),
                          child: Text(
                            'STAFF MODE',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1,
                                ),
                          ),
                        ),
                        const Spacer(),
                        const RealtimeStatusChip(),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      "Today's Queue",
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap a queue to open the console',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                    ),
                  ],
                ),
              ),
            ),
            async.when(
              loading: () => const SliverFillRemaining(
                child: PageLoading(message: 'Loading queues…'),
              ),
              error: (e, _) => SliverFillRemaining(
                child: PageError(message: apiExceptionMessage(e), onRetry: () => ref.invalidate(staffQueuesProvider)),
              ),
              data: (queues) {
                if (queues.isEmpty) {
                  return const SliverFillRemaining(
                    child: EmptyStateView(
                      title: 'No queues today',
                      message: 'Ask your manager to open a queue for this branch.',
                      icon: Icons.queue_outlined,
                    ),
                  );
                }
                final totalWaiting =
                    queues.fold<int>(0, (sum, q) => sum + q.waitingCount);
                return SliverList(
                  delegate: SliverChildListDelegate([
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                      child: MetricCard(
                        label: 'Customers waiting',
                        value: '$totalWaiting',
                        icon: Icons.people_outline,
                        accentColor: product.accent,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...queues.map((q) => _StaffQueueCard(queue: q)),
                    const SizedBox(height: AppSpacing.xxl),
                  ]),
                );
              },
            ),
          ],
        ),
    );
  }

  ProductThemeData productThemeFor(BuildContext context) {
    return Theme.of(context).extension<ProductTheme>()?.data ??
        ProductThemeData.forIdentity(ProductIdentity.staff);
  }
}

class _StaffQueueCard extends StatelessWidget {
  const _StaffQueueCard({required this.queue});

  final QueueModel queue;

  @override
  Widget build(BuildContext context) {
    final product = Theme.of(context).extension<ProductTheme>()?.data ??
        ProductThemeData.forIdentity(ProductIdentity.staff);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        0,
      ),
      child: AppCard(
        onTap: () => context.push(AppRoutes.queueConsole(queue.id)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    queue.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                StatusBadge(status: queue.status),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                _StatPill(
                  icon: Icons.hourglass_top,
                  label: '${queue.waitingCount} waiting',
                  color: product.accent,
                ),
                const SizedBox(width: 8),
                _StatPill(
                  icon: Icons.timer_outlined,
                  label: queue.status == 'ACTIVE' ? 'Open' : 'Paused',
                  color: AppColors.success,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              label: 'Open Console',
              icon: Icons.play_arrow_rounded,
              onPressed: () => context.push(AppRoutes.queueConsole(queue.id)),
              fullWidth: true,
              variant: AppButtonVariant.primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
