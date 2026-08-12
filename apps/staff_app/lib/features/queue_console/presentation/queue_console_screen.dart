import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_error_message.dart' show apiExceptionMessage;
import '../../../core/network/business_api_client.dart';
import '../../../core/providers/queues_provider.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/widgets/calm/calm_queue_console.dart';
import '../../../shared/widgets/calm/calm_queue_entry_card.dart';
import '../../../shared/widgets/calm/calm_section_label.dart';
import '../../../shared/widgets/staff/call_next_sheet.dart';
import '../../../shared/widgets/staff/service_mode_helpers.dart';
import '../../../shared/widgets/staff/staff_empty_states.dart';

final queueSnapshotProvider =
    FutureProvider.autoDispose.family<QueueSnapshotModel, String>((ref, queueId) async {
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

bool _matchesSearch(QueueEntryModel entry, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  return (entry.customerName?.toLowerCase().contains(q) ?? false) ||
      (entry.customerPhone?.toLowerCase().contains(q) ?? false) ||
      entry.displayCode.toLowerCase().contains(q);
}

String _realtimeLabel(RealtimeStatus status) => switch (status) {
      RealtimeStatus.connected => 'Live',
      RealtimeStatus.connecting => 'Connecting',
      RealtimeStatus.reconnecting => 'Reconnecting',
      RealtimeStatus.disconnected => 'Updating',
    };

class QueueConsoleScreen extends ConsumerStatefulWidget {
  const QueueConsoleScreen({super.key, required this.queueId});

  final String queueId;

  @override
  ConsumerState<QueueConsoleScreen> createState() => _QueueConsoleScreenState();
}

class _QueueConsoleScreenState extends ConsumerState<QueueConsoleScreen> {
  String? _selectedEntryId;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async => ref.invalidate(queueSnapshotProvider(widget.queueId));

  void _openCallNextSheet(
    BuildContext context,
    String serviceMode,
    QueueEntryModel? next, {
    bool calling = false,
  }) {
    showCallNextSheet(
      context: context,
      ref: ref,
      queueId: widget.queueId,
      serviceMode: serviceMode,
      nextEntry: next,
      calling: calling,
      onRefresh: _refresh,
    );
  }

  List<QueueEntryModel> _filter(List<QueueEntryModel> entries) =>
      entries.where((e) => _matchesSearch(e, _searchQuery)).toList();

  @override
  Widget build(BuildContext context) {
    ref.watch(queueConsoleRealtimeBindingProvider(widget.queueId));
    final async = ref.watch(queueSnapshotProvider(widget.queueId));
    final isWide = Breakpoints.isTablet(context);
    final realtimeStatus = ref.watch(realtimeStatusProvider);
    final liveLabel = realtimeStatus.when(
      data: _realtimeLabel,
      loading: () => 'Connecting',
      error: (_, __) => 'Updating',
    );

    return Scaffold(
      backgroundColor: AppColors.calmIvory,
      appBar: AppBar(
        backgroundColor: AppColors.calmIvory,
        surfaceTintColor: Colors.transparent,
        title: async.when(
          data: (s) => Text(
            s.queue.name,
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.calmCharcoal),
          ),
          loading: () => const Text('Queue'),
          error: (_, __) => const Text('Queue'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.calmWarmGray),
            tooltip: 'Refresh queue',
            onPressed: _refresh,
          ),
        ],
      ),
      body: async.when(
        loading: () => const CalmQueueSkeleton(),
        error: (e, _) => StaffLoadErrorState(
          message: apiExceptionMessage(e),
          onRetry: _refresh,
        ),
        data: (snapshot) {
          if (snapshot.queue.isPaused) {
            return StaffQueuePausedState(
              onResume: () => queueAction(ref, widget.queueId, 'resume', _refresh),
            );
          }
          if (snapshot.queue.isClosed) {
            return const StaffQueueClosedState();
          }

          final serviceMode = snapshot.queue.serviceMode;
          final modeInfo = ServiceModeInfo.forMode(serviceMode);

          final called = _filter(
            snapshot.entries.where((e) => e.status == 'CALLED').toList(),
          );
          final held = _filter(
            snapshot.entries.where((e) => e.status == 'HOLDING').toList(),
          );
          final waiting = _filter(
            snapshot.entries.where((e) => e.status == 'WAITING').toList()
              ..sort((a, b) => (a.position ?? 999).compareTo(b.position ?? 999)),
          );

          final totalWaiting = waiting.length;
          final nextUp = waiting.isNotEmpty ? waiting.first : null;

          if (isWide) {
            return _WideConsoleLayout(
              snapshot: snapshot,
              serviceMode: serviceMode,
              liveLabel: liveLabel,
              called: called,
              held: held,
              waiting: waiting,
              selectedEntryId: _selectedEntryId,
              searchQuery: _searchQuery,
              searchController: _searchController,
              onSearchChanged: (v) => setState(() => _searchQuery = v),
              onSelectEntry: (id) => setState(() => _selectedEntryId = id),
              onCallNext: () => _openCallNextSheet(
                context,
                serviceMode,
                nextUp,
                calling: nextUp != null,
              ),
              onCallEntry: (entry) => _openCallNextSheet(
                context,
                serviceMode,
                entry,
                calling: true,
              ),
              onRefresh: _refresh,
              queueId: widget.queueId,
              ref: ref,
            );
          }

          return Stack(
            children: [
              RefreshIndicator(
                color: AppColors.calmViolet,
                onRefresh: _refresh,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.md,
                    AppSpacing.md,
                    totalWaiting > 0 ? 148 : AppSpacing.xl,
                  ),
                  children: [
                    CalmQueueConsoleHeader(
                      queueName: snapshot.queue.name,
                      serviceMode: serviceMode,
                      waitingCount: totalWaiting,
                      liveLabel: liveLabel,
                      waitingUnit: modeInfo.waitingLabel,
                    ),
                    if (snapshot.entries.length > 4) ...[
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _searchController,
                        onChanged: (v) => setState(() => _searchQuery = v),
                        decoration: InputDecoration(
                          hintText: 'Search name, phone or token',
                          hintStyle: TextStyle(color: AppColors.calmWarmGray.withValues(alpha: 0.8)),
                          prefixIcon: const Icon(Icons.search, color: AppColors.calmWarmGray),
                          filled: true,
                          fillColor: AppColors.lightSurface,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(999),
                            borderSide: const BorderSide(color: AppColors.calmBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(999),
                            borderSide: const BorderSide(color: AppColors.calmBorder),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ],
                    if (called.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      const CalmSectionLabel('NOW SERVING'),
                      const SizedBox(height: AppSpacing.sm),
                      ...called.map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: CalmQueueEntryCard(
                            entry: e,
                            serviceMode: serviceMode,
                            onSeat: () => entryAction(ref, widget.queueId, e.id, 'complete', _refresh),
                            onHold: () => entryAction(ref, widget.queueId, e.id, 'hold', _refresh),
                            onSkip: () => entryAction(ref, widget.queueId, e.id, 'skip', _refresh),
                            onRecall: () => entryAction(ref, widget.queueId, e.id, 'recall', _refresh),
                          ),
                        ),
                      ),
                    ],
                    if (held.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      const CalmSectionLabel('ON HOLD'),
                      const SizedBox(height: AppSpacing.sm),
                      ...held.map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: CalmQueueEntryCard(
                            entry: e,
                            serviceMode: serviceMode,
                            onRecall: () => entryAction(ref, widget.queueId, e.id, 'resume', _refresh),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    if (waiting.isEmpty && called.isEmpty && held.isEmpty)
                      CalmQueueCaughtUp(
                        onAddCustomer: () => showWalkIn(context, ref, widget.queueId, _refresh),
                      )
                    else if (waiting.isNotEmpty) ...[
                      if (nextUp != null) ...[
                        CalmQueueEntryCard(
                          entry: nextUp,
                          serviceMode: serviceMode,
                          isNextUp: true,
                          onCall: () => _openCallNextSheet(
                            context,
                            serviceMode,
                            nextUp,
                            calling: true,
                          ),
                        ),
                        if (waiting.length > 1) ...[
                          const SizedBox(height: AppSpacing.lg),
                          const CalmSectionLabel('WAITING'),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                      ],
                      ...waiting.skip(nextUp != null ? 1 : 0).map(
                            (e) => Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                              child: CalmQueueEntryCard(
                                entry: e,
                                serviceMode: serviceMode,
                                onCall: () => _openCallNextSheet(
                                  context,
                                  serviceMode,
                                  e,
                                  calling: true,
                                ),
                                onHold: () => entryAction(ref, widget.queueId, e.id, 'hold', _refresh),
                                onSkip: () => entryAction(ref, widget.queueId, e.id, 'skip', _refresh),
                              ),
                            ),
                          ),
                    ],
                  ],
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: totalWaiting > 0
                    ? CalmQueueStickyAction(
                        waitingCount: totalWaiting,
                        waitingUnit: modeInfo.waitingLabel,
                        actionLabel: modeInfo.callNextActionLabel,
                        onPressed: () => _openCallNextSheet(
                          context,
                          serviceMode,
                          nextUp,
                          calling: nextUp != null,
                        ),
                      )
                    : CalmQueueStickyAction(
                        waitingCount: 0,
                        waitingUnit: '',
                        actionLabel: 'Add customer',
                        onPressed: () => showWalkIn(context, ref, widget.queueId, _refresh),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _WideConsoleLayout extends StatelessWidget {
  const _WideConsoleLayout({
    required this.snapshot,
    required this.serviceMode,
    required this.liveLabel,
    required this.called,
    required this.held,
    required this.waiting,
    required this.selectedEntryId,
    required this.searchQuery,
    required this.searchController,
    required this.onSearchChanged,
    required this.onSelectEntry,
    required this.onCallNext,
    required this.onCallEntry,
    required this.onRefresh,
    required this.queueId,
    required this.ref,
  });

  final QueueSnapshotModel snapshot;
  final String serviceMode;
  final String liveLabel;
  final List<QueueEntryModel> called;
  final List<QueueEntryModel> held;
  final List<QueueEntryModel> waiting;
  final String? selectedEntryId;
  final String searchQuery;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onSelectEntry;
  final VoidCallback onCallNext;
  final ValueChanged<QueueEntryModel> onCallEntry;
  final Future<void> Function() onRefresh;
  final String queueId;
  final WidgetRef ref;

  QueueEntryModel? get _selected {
    final all = [...called, ...held, ...waiting];
    if (selectedEntryId != null) {
      for (final e in all) {
        if (e.id == selectedEntryId) return e;
      }
    }
    if (called.isNotEmpty) return called.first;
    if (waiting.isNotEmpty) return waiting.first;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final modeInfo = ServiceModeInfo.forMode(serviceMode);
    final selected = _selected;
    final listEntries = [...called, ...held, ...waiting];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 5,
          child: RefreshIndicator(
            color: AppColors.calmViolet,
            onRefresh: onRefresh,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                CalmQueueConsoleHeader(
                  queueName: snapshot.queue.name,
                  serviceMode: serviceMode,
                  waitingCount: waiting.length,
                  liveLabel: liveLabel,
                  waitingUnit: modeInfo.waitingLabel,
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: searchController,
                  onChanged: onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Search name, phone or token',
                    prefixIcon: const Icon(Icons.search, color: AppColors.calmWarmGray),
                    filled: true,
                    fillColor: AppColors.lightSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: AppColors.calmBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: AppColors.calmBorder),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                if (listEntries.isEmpty)
                  CalmQueueCaughtUp(
                    onAddCustomer: () => showWalkIn(context, ref, queueId, onRefresh),
                  )
                else
                  ...listEntries.asMap().entries.map((item) {
                    final e = item.value;
                    final isNext = waiting.isNotEmpty && e.id == waiting.first.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: CalmQueueEntryCard(
                        entry: e,
                        serviceMode: serviceMode,
                        isNextUp: isNext,
                        isSelected: e.id == selected?.id,
                        compact: true,
                        onTap: () => onSelectEntry(e.id),
                        onCall: e.status == 'WAITING'
                            ? () => onCallEntry(e)
                            : null,
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        Container(
          width: 1,
          color: AppColors.calmBorder,
        ),
        Expanded(
          flex: 4,
          child: ColoredBox(
            color: AppColors.calmIvory,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: selected == null
                  ? Center(
                      child: Text(
                        'Select a customer from the queue',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: AppColors.calmWarmGray,
                            ),
                      ),
                    )
                  : CalmQueueDetailPanel(
                      entry: selected,
                      serviceMode: serviceMode,
                      onCall: selected.status == 'WAITING'
                          ? () => onCallEntry(selected)
                          : null,
                      onSeat: selected.status == 'CALLED'
                          ? () => entryAction(ref, queueId, selected.id, 'complete', onRefresh)
                          : null,
                      onHold: selected.status != 'HOLDING'
                          ? () => entryAction(ref, queueId, selected.id, 'hold', onRefresh)
                          : null,
                      onSkip: () => entryAction(ref, queueId, selected.id, 'skip', onRefresh),
                      onRecall: selected.status == 'HOLDING'
                          ? () => entryAction(ref, queueId, selected.id, 'resume', onRefresh)
                          : selected.status == 'CALLED'
                              ? () => entryAction(ref, queueId, selected.id, 'recall', onRefresh)
                              : null,
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Shared queue operations (unchanged API contracts) ───

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
      title: const Text('Transfer to queue'),
      content: DropdownButtonFormField<String>(
        initialValue: targetId,
        items: [
          for (final q in targets)
            DropdownMenuItem(value: q.id, child: Text(q.name)),
        ],
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
          TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Name'),
            textInputAction: TextInputAction.next,
          ),
          TextField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'Phone'),
            keyboardType: TextInputType.phone,
          ),
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
