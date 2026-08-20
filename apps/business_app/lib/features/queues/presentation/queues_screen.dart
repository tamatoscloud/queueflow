import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_widgets/queueflow_widgets.dart';

import '../../../core/cache/cached_fetch.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../features/queue_console/presentation/queue_console_screen.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_live_indicator.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/skeleton_loaders.dart';
import '../../restaurant_demo/presentation/service_mode_helpers.dart';

final queuesRealtimeProvider = Provider.autoDispose<void>((ref) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;
  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () => ref.invalidate(queuesProvider),
    onSubscribe: () async {
      await client.connect();
      return client.subscribeBusinessQueues(businessId);
    },
    pollInterval: const Duration(seconds: 10),
  );
});

final queuesProvider = FutureProvider.autoDispose<List<QueueModel>>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) return [];
  final api = ref.watch(businessApiClientProvider);
  final cache = ref.watch(offlineCacheProvider);
  final branchId = ref.watch(selectedBranchIdProvider);
  final businessId = auth.session?.user.businessId;
  try {
    return cachedFetchList(
      cache: cache,
      cacheKey: 'queues:${branchId ?? 'all'}:$businessId',
      fetch: () => api.getQueues(branchId: branchId, businessId: businessId),
      fromJson: QueueModel.fromJson,
      toJson: (q) => q.toJson(),
    );
  } on UnauthorizedException {
    await ref.read(authControllerProvider.notifier).sessionExpired();
    rethrow;
  }
});

final queueDetailProvider = FutureProvider.autoDispose.family<QueueModel, String>((ref, id) async {
  return ref.watch(businessApiClientProvider).getQueue(id);
});

class QueuesScreen extends ConsumerWidget {
  const QueuesScreen({super.key});

  Future<void> _createQueue(BuildContext context, WidgetRef ref) async {
    final name = TextEditingController();
    final prefix = TextEditingController(text: 'A');
    final description = TextEditingController();
    var serviceMode = 'DINE_IN';
    final user = ref.read(currentUserProvider);
    final branchId = ref.read(selectedBranchIdProvider);
    if (user?.businessId == null || branchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a branch before creating a queue')),
      );
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Create queue'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: prefix, decoration: const InputDecoration(labelText: 'Prefix')),
              TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: serviceMode,
                decoration: const InputDecoration(labelText: 'Service mode'),
                items: const [
                  DropdownMenuItem(value: 'DINE_IN', child: Text('Dine-in')),
                  DropdownMenuItem(value: 'TAKEAWAY', child: Text('Takeaway')),
                  DropdownMenuItem(value: 'DRIVE_IN', child: Text('Drive-in')),
                ],
                onChanged: (v) {
                  if (v != null) setLocal(() => serviceMode = v);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                await ref.read(businessApiClientProvider).createQueue({
                  'businessId': user!.businessId,
                  'branchId': branchId,
                  'name': name.text.trim(),
                  'prefix': prefix.text.trim().isEmpty ? 'A' : prefix.text.trim(),
                  'serviceMode': serviceMode,
                  if (description.text.isNotEmpty) 'description': description.text.trim(),
                });
                ref.invalidate(queuesProvider);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(queuesRealtimeProvider);
    final async = ref.watch(queuesProvider);
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(queuesProvider),
        child: async.when(
          loading: () => ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: 5,
            itemBuilder: (_, __) => const ListTileSkeleton(),
          ),
          error: (e, _) => PageError(
            message: 'We couldn\'t load your queues.',
            onRetry: () => ref.invalidate(queuesProvider),
          ),
          data: (queues) {
            if (queues.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyStateView(
                    title: 'No queues yet',
                    message: 'Create your first queue to start serving customers.',
                    icon: Icons.queue_outlined,
                  ),
                ],
              );
            }
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                const CalmSectionLabel('Your queues', subtitle: 'Open console or show customer QR'),
                const SizedBox(height: AppSpacing.sm),
                ...queues.map((q) {
                  final info = ServiceModeInfo.forMode(q.serviceMode);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: CalmCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          InkWell(
                            onTap: () => context.push(AppRoutes.queueDetail(q.id)),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                              child: Row(
                                children: [
                                  Icon(info.icon, color: AppColors.primary),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          info.label,
                                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                                color: AppColors.calmWarmGray,
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                        Text(
                                          q.name,
                                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                fontWeight: FontWeight.w700,
                                              ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${q.waitingCount} ${info.waitingLabel}'
                                          '${q.averageServiceTimeMinutes > 0 ? ' · ~${q.averageServiceTimeMinutes} min avg' : ''}',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                color: AppColors.calmWarmGray,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusBadge(status: q.status),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => context.push(AppRoutes.restaurantQr),
                                  icon: const Icon(Icons.qr_code_2),
                                  label: const Text('QR'),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                flex: 2,
                                child: FilledButton.icon(
                                  onPressed: () => context.push(AppRoutes.queueConsole(q.id)),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.primaryDark,
                                    minimumSize: const Size(0, 48),
                                  ),
                                  icon: const Icon(Icons.campaign_outlined),
                                  label: const Text('Open console'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createQueue(context, ref),
        backgroundColor: AppColors.calmViolet,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New queue'),
      ),
    );
  }
}

class QueueDetailScreen extends ConsumerWidget {
  const QueueDetailScreen({super.key, required this.queueId});

  final String queueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(queueConsoleRealtimeBindingProvider(queueId));
    final async = ref.watch(queueSnapshotProvider(queueId));
    final realtime = ref.watch(realtimeStatusProvider);
    final connectionLabel = realtime.when(
      data: (s) => s == RealtimeStatus.connected ? 'Live' : 'Updating…',
      loading: () => 'Updating…',
      error: (_, __) => 'Updating…',
    );

    Future<void> refresh() async => ref.invalidate(queueSnapshotProvider(queueId));

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        elevation: 0,
        title: async.when(
          data: (s) => Text(s.queue.name),
          loading: () => const Text('Queue'),
          error: (_, __) => const Text('Queue'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_outlined),
            tooltip: 'Queue settings',
            onPressed: () => context.push(AppRoutes.queueSettings(queueId)),
          ),
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: CalmLiveIndicator(label: connectionLabel),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('We couldn\'t load this queue.'),
                const SizedBox(height: AppSpacing.md),
                CalmPrimaryButton(label: 'Try again', onPressed: refresh),
              ],
            ),
          ),
        ),
        data: (snapshot) => _QueueDetailBody(
          snapshot: snapshot,
          queueId: queueId,
          onRefresh: refresh,
        ),
      ),
    );
  }
}

class _QueueDetailBody extends ConsumerWidget {
  const _QueueDetailBody({
    required this.snapshot,
    required this.queueId,
    required this.onRefresh,
  });

  final QueueSnapshotModel snapshot;
  final String queueId;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = snapshot.queue;
    final mode = queue.serviceMode;
    final modeInfo = ServiceModeInfo.forMode(mode);
    final waiting = snapshot.entries.where((e) => e.status == 'WAITING').length;
    final serving = snapshot.entries.where((e) => e.status == 'CALLED').length;
    final avgWait = snapshot.metrics.averageWaitMinutes;

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                CalmCard(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        modeInfo.label,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.calmWarmGray,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${snapshot.metrics.waitingCount}',
                                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.calmCharcoal,
                                      ),
                                ),
                                Text(
                                  modeInfo.waitingUnitLabel(snapshot.metrics.waitingCount),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  avgWait > 0 ? '~$avgWait min' : '—',
                                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.calmCharcoal,
                                      ),
                                ),
                                Text(
                                  'Average wait',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (queue.description?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          queue.description!,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                const CalmSectionLabel('Quick actions'),
                const SizedBox(height: AppSpacing.sm),
                CalmCard(
                  onTap: () => context.push(AppRoutes.queueConsole(queueId)),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.calmLilac,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.campaign_outlined, color: AppColors.calmViolet),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Manage queue',
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              serving > 0
                                  ? '$serving being served · $waiting waiting'
                                  : waiting > 0
                                      ? '$waiting ${modeInfo.waitingUnitLabel(waiting)} waiting'
                                      : 'Ready for the next guest',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.calmWarmGray),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                CalmCard(
                  onTap: () => context.push(AppRoutes.restaurantQr),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.calmPeach.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.qr_code_2_outlined, color: AppColors.calmCharcoal),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Customer QR',
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              modeInfo.scanInstruction,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.calmWarmGray),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                const CalmSectionLabel('Queue status'),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _StatusAction(
                      label: 'Open',
                      onPressed: () => _status(context, ref, queueId, 'open', queue),
                    ),
                    _StatusAction(
                      label: 'Pause',
                      onPressed: () => _status(context, ref, queueId, 'pause', queue),
                    ),
                    _StatusAction(
                      label: 'Resume',
                      onPressed: () => _status(context, ref, queueId, 'resume', queue),
                    ),
                    _StatusAction(
                      label: 'Close',
                      onPressed: () => _status(context, ref, queueId, 'close', queue),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: const BoxDecoration(
            color: AppColors.lightSurface,
            border: Border(top: BorderSide(color: AppColors.calmBorder)),
          ),
          child: SafeArea(
            top: false,
            child: CalmPrimaryButton(
              label: 'Open queue console',
              icon: Icons.play_arrow_rounded,
              onPressed: () => context.push(AppRoutes.queueConsole(queueId)),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _status(BuildContext context, WidgetRef ref, String id, String action, QueueModel queue) async {
    final info = ServiceModeInfo.forMode(queue.serviceMode);
    if (action == 'pause') {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Pause ${info.label} queue?'),
          content: const Text('Customers will no longer be able to join until you reopen it.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Pause')),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    final api = ref.read(businessApiClientProvider);
    switch (action) {
      case 'open':
        await api.openQueue(id);
      case 'pause':
        await api.pauseQueue(id);
      case 'resume':
        await api.resumeQueue(id);
      case 'close':
        await api.closeQueue(id);
    }
    ref.invalidate(queueSnapshotProvider(id));
    ref.invalidate(queueDetailProvider(id));
    ref.invalidate(queuesProvider);
  }
}

class _StatusAction extends StatelessWidget {
  const _StatusAction({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
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

class QueueSettingsScreen extends ConsumerStatefulWidget {
  const QueueSettingsScreen({super.key, required this.queueId});
  final String queueId;

  @override
  ConsumerState<QueueSettingsScreen> createState() => _QueueSettingsScreenState();
}

class _QueueSettingsScreenState extends ConsumerState<QueueSettingsScreen> {
  final _avgService = TextEditingController();
  final _capacity = TextEditingController();

  @override
  void dispose() {
    _avgService.dispose();
    _capacity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(queueDetailProvider(widget.queueId));
    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        elevation: 0,
        title: const Text('Queue settings'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.calmViolet)),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('We couldn\'t load queue settings.'),
                const SizedBox(height: AppSpacing.md),
                CalmPrimaryButton(
                  label: 'Try again',
                  onPressed: () => ref.invalidate(queueDetailProvider(widget.queueId)),
                ),
              ],
            ),
          ),
        ),
        data: (queue) {
          _avgService.text = queue.averageServiceTimeMinutes.toString();
          _capacity.text = queue.maxCapacity?.toString() ?? '';
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                CalmCard(
                  child: Column(
                    children: [
                      TextField(
                        controller: _avgService,
                        decoration: const InputDecoration(labelText: 'Average wait estimate (min)'),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _capacity,
                        decoration: const InputDecoration(labelText: 'Capacity'),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Priority enabled'),
                        value: queue.priorityEnabled,
                        onChanged: (_) {},
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Accepting entries'),
                        value: queue.isAcceptingEntries,
                        onChanged: (_) {},
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                CalmPrimaryButton(
                  label: 'Save',
                  onPressed: () async {
                    await ref.read(businessApiClientProvider).updateQueue(widget.queueId, {
                      'averageServiceTimeMinutes': int.tryParse(_avgService.text) ?? 10,
                      if (_capacity.text.isNotEmpty) 'maxCapacity': int.tryParse(_capacity.text),
                    });
                    ref.invalidate(queueDetailProvider(widget.queueId));
                    if (context.mounted) context.pop();
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
