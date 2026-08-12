import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../features/queues/presentation/queues_screen.dart';
import '../../../features/restaurant_demo/presentation/service_mode_helpers.dart';
import '../../../shared/widgets/calm/calm_card.dart';
import '../../../shared/widgets/calm/calm_live_indicator.dart';
import '../../../shared/widgets/calm/calm_primary_button.dart';
import '../../../shared/widgets/calm/calm_queue_entry_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';

final queueSnapshotProvider = FutureProvider.autoDispose.family<QueueSnapshotModel, String>((ref, queueId) async {
  return ref.watch(businessApiClientProvider).getQueueSnapshot(queueId);
});

final queueConsoleRealtimeBindingProvider =
    Provider.autoDispose.family<void, String>((ref, queueId) {
  final user = ref.watch(currentUserProvider);
  final businessId = user?.businessId;
  if (businessId == null) return;

  final client = ref.watch(realtimeClientProvider);
  bindRealtimeRefresh(
    ref: ref,
    client: client,
    onRefresh: () => ref.invalidate(queueSnapshotProvider(queueId)),
    onSubscribe: () async {
      await client.connect();
      return client.subscribeQueueDetail(queueId);
    },
    pollInterval: const Duration(seconds: 10),
  );
});

class QueueConsoleScreen extends ConsumerWidget {
  const QueueConsoleScreen({super.key, required this.queueId});

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
        data: (snapshot) => _CalmQueueWorkspace(
          snapshot: snapshot,
          queueId: queueId,
          onRefresh: refresh,
        ),
      ),
    );
  }
}

class _CalmQueueWorkspace extends ConsumerWidget {
  const _CalmQueueWorkspace({
    required this.snapshot,
    required this.queueId,
    required this.onRefresh,
  });

  final QueueSnapshotModel snapshot;
  final String queueId;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = snapshot.queue.serviceMode;
    final modeInfo = ServiceModeInfo.forMode(mode);
    final waiting = snapshot.entries.where((e) => e.status == 'WAITING').toList();
    final holding = snapshot.entries.where((e) => e.status == 'HOLDING').toList();
    final serving = snapshot.entries.where((e) => e.status == 'CALLED').toList();
    final completed = snapshot.entries.where((e) => e.status == 'COMPLETED').toList();
    final nextUp = waiting.isNotEmpty ? waiting.first : null;
    final restWaiting = waiting.length > 1 ? waiting.sublist(1) : <QueueEntryModel>[];
    final avgWait = snapshot.metrics.averageWaitMinutes;

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
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
                          _StatBlock(
                            value: '${snapshot.metrics.waitingCount}',
                            label: modeInfo.waitingUnitLabel(snapshot.metrics.waitingCount),
                          ),
                          const SizedBox(width: AppSpacing.lg),
                          _StatBlock(
                            value: avgWait > 0 ? '~$avgWait min' : '—',
                            label: 'Average wait',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (serving.isNotEmpty) ...[
                  const CalmSectionLabel('Now serving'),
                  const SizedBox(height: AppSpacing.sm),
                  ...serving.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: CalmQueueEntryCard(
                        entry: e,
                        serviceMode: mode,
                        onComplete: () => entryAction(ref, queueId, e.id, 'complete', onRefresh),
                        onRecall: () => entryAction(ref, queueId, e.id, 'recall', onRefresh),
                        onSkip: () => entryAction(ref, queueId, e.id, 'skip', onRefresh),
                        onHold: () => entryAction(ref, queueId, e.id, 'hold', onRefresh),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (holding.isNotEmpty) ...[
                  const CalmSectionLabel('On hold'),
                  const SizedBox(height: AppSpacing.sm),
                  ...holding.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: CalmQueueEntryCard(
                        entry: e,
                        serviceMode: mode,
                        onResume: () => entryAction(ref, queueId, e.id, 'resume', onRefresh),
                        onSkip: () => entryAction(ref, queueId, e.id, 'skip', onRefresh),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (nextUp != null)
                  CalmQueueEntryCard(
                    entry: nextUp,
                    serviceMode: mode,
                    isNextUp: true,
                  ),
                if (restWaiting.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  CalmSectionLabel('Waiting · ${restWaiting.length}'),
                  const SizedBox(height: AppSpacing.sm),
                  ...restWaiting.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: CalmQueueEntryCard(
                        entry: e,
                        serviceMode: mode,
                        compact: true,
                      ),
                    ),
                  ),
                ],
                if (waiting.isEmpty && serving.isEmpty && holding.isEmpty)
                  const CalmEmptyInline(message: 'No one waiting — ready for the next guest.'),
                if (completed.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.lg),
                  CalmSectionLabel('Completed today · ${completed.length}'),
                  const SizedBox(height: AppSpacing.sm),
                  ...completed.take(5).map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: CalmQueueEntryCard(
                            entry: e,
                            serviceMode: mode,
                            compact: true,
                          ),
                        ),
                      ),
                ],
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
            child: Column(
              children: [
                CalmPrimaryButton(
                  label: 'Call next',
                  icon: Icons.campaign_outlined,
                  onPressed: waiting.isEmpty && serving.isEmpty
                      ? null
                      : () => queueAction(ref, queueId, 'call', onRefresh),
                ),
                const SizedBox(height: AppSpacing.sm),
                OutlinedButton.icon(
                  onPressed: () => showWalkIn(context, ref, queueId, onRefresh),
                  icon: const Icon(Icons.person_add_outlined),
                  label: const Text('Add customer'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    foregroundColor: AppColors.calmViolet,
                    side: const BorderSide(color: AppColors.calmBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBlock extends StatelessWidget {
  const _StatBlock({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.calmCharcoal,
                ),
          ),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.calmWarmGray)),
        ],
      ),
    );
  }
}

class CalmEmptyInline extends StatelessWidget {
  const CalmEmptyInline({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return CalmCard(
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.calmWarmGray),
      ),
    );
  }
}

Future<void> queueAction(
  WidgetRef ref,
  String queueId,
  String action,
  Future<void> Function() refresh,
) async {
  final api = ref.read(businessApiClientProvider);
  switch (action) {
    case 'call':
      await api.callNext(queueId);
    case 'pause':
      await api.pauseQueue(queueId);
    case 'resume':
      await api.resumeQueue(queueId);
  }
  await refresh();
}

Future<void> entryAction(
  WidgetRef ref,
  String queueId,
  String entryId,
  String action,
  Future<void> Function() refresh,
) async {
  if (action == 'skip') {
    final context = ref.context;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark as no show?'),
        content: const Text('This guest will be removed from the active queue.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('No show')),
        ],
      ),
    );
    if (confirmed != true) return;
  }

  final api = ref.read(businessApiClientProvider);
  switch (action) {
    case 'hold':
      await api.holdEntry(entryId);
    case 'resume':
      await api.resumeHeld(entryId);
    case 'skip':
      await api.skipEntry(entryId);
    case 'recall':
      await api.recallEntry(entryId);
    case 'complete':
      await api.completeEntry(entryId);
    case 'cancel':
      await api.cancelEntry(entryId);
    case 'priority':
      await api.setPriority(entryId, 10);
    case 'transfer':
      await transferEntry(ref, queueId, entryId, refresh);
      return;
  }
  await refresh();
}

Future<void> transferEntry(
  WidgetRef ref,
  String queueId,
  String entryId,
  Future<void> Function() refresh,
) async {
  final queues = await ref.read(queuesProvider.future);
  final targets = queues.where((q) => q.id != queueId).toList();
  if (targets.isEmpty) return;
  String? targetId = targets.first.id;
  if (!ref.context.mounted) return;
  await showDialog<void>(
    context: ref.context,
    builder: (ctx) => AlertDialog(
      title: const Text('Transfer to another queue'),
      content: DropdownButtonFormField<String>(
        initialValue: targetId,
        items: [for (final q in targets) DropdownMenuItem(value: q.id, child: Text(q.name))],
        onChanged: (v) => targetId = v,
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(
          onPressed: () async {
            if (targetId != null) {
              await ref.read(businessApiClientProvider).transferEntry(entryId, targetId!);
            }
            if (ctx.mounted) Navigator.pop(ctx);
            await refresh();
          },
          child: const Text('Transfer'),
        ),
      ],
    ),
  );
}

Future<void> showWalkIn(
  BuildContext context,
  WidgetRef ref,
  String queueId,
  Future<void> Function() refresh,
) async {
  final name = TextEditingController();
  final phone = TextEditingController();
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Add customer'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(
          onPressed: () async {
            await ref.read(businessApiClientProvider).walkIn(queueId, {
              'fullName': name.text,
              'phone': phone.text,
              'partySize': 1,
              'notificationPreference': 'SMS',
            });
            if (ctx.mounted) Navigator.pop(ctx);
            await refresh();
          },
          child: const Text('Add'),
        ),
      ],
    ),
  );
}
