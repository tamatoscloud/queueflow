import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_network/queueflow_network.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/cache/cached_fetch.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/session/session_providers.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../features/queue_console/presentation/queue_console_screen.dart';
import '../../../shared/feedback.dart';
import '../../../shared/service_mode/service_mode_helpers.dart';
import '../../branches/presentation/branches_screen.dart';

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
    return await cachedFetchList(
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

const _modes = [
  (value: 'DINE_IN', label: 'Dine-in', hint: 'Tables'),
  (value: 'TAKEAWAY', label: 'Takeaway', hint: 'Pickup orders'),
  (value: 'DRIVE_IN', label: 'Drive-in', hint: 'Guests in cars'),
];

String _fmtMinutes(double value) {
  final rounded = value.round();
  return value == rounded ? '$rounded' : value.toStringAsFixed(1);
}

String queueStatusLabel(String status) => switch (status.toUpperCase()) {
      'ACTIVE' => 'Open',
      'PAUSED' => 'Paused',
      'CLOSED' => 'Closed',
      'ARCHIVED' => 'Archived',
      _ => status,
    };

Widget queueStatusPill(String status) {
  final (bg, fg) = switch (status.toUpperCase()) {
    'ACTIVE' => (QuykColors.lime, QuykColors.green),
    'PAUSED' => (QuykColors.warningTint, const Color(0xFF7A4B0C)),
    _ => (QuykColors.mist, QuykColors.greenMuted),
  };
  return QuykPill(label: queueStatusLabel(status), background: bg, foreground: fg, fontSize: 11);
}

class QueuesScreen extends ConsumerWidget {
  const QueuesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(queuesRealtimeProvider);
    final async = ref.watch(queuesProvider);

    return QuykPage(
      title: 'Waiting lines',
      subtitle: 'Serve guests, share join codes and tune each line.',
      action: FilledButton.icon(
        onPressed: () => showCreateQueueSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New line'),
      ),
      onRefresh: () async => ref.invalidate(queuesProvider),
      children: [
        async.when(
          loading: () => const QuykLoadingBlock(),
          error: (e, _) => QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load your waiting lines',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(queuesProvider),
          ),
          data: (queues) {
            if (queues.isEmpty) {
              return QuykMessageCard(
                icon: Icons.format_list_numbered_rounded,
                title: 'No waiting lines yet',
                subtitle: 'Create your first line so guests can join and you can start serving.',
                actionLabel: 'Create a line',
                onAction: () => showCreateQueueSheet(context, ref),
              );
            }
            return QuykGrid(
              minTileWidth: 340,
              children: [for (final q in queues) _QueueCard(queue: q)],
            );
          },
        ),
      ],
    );
  }
}

class _QueueCard extends StatelessWidget {
  const _QueueCard({required this.queue});

  final QueueModel queue;

  @override
  Widget build(BuildContext context) {
    final info = ServiceModeInfo.forMode(queue.serviceMode);
    return QuykCard(
      onTap: () => context.push(AppRoutes.queueDetail(queue.id)),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              QuykIconBubble(icon: info.icon, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      queue.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: QuykColors.ink),
                    ),
                    Text(info.label, style: const TextStyle(fontSize: 12, color: QuykColors.subtle)),
                  ],
                ),
              ),
              queueStatusPill(queue.status),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${queue.waitingCount}',
                style: const TextStyle(
                  fontSize: 40,
                  height: 1,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -1,
                  color: QuykColors.green,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '${info.waitingUnitLabel(queue.waitingCount)} waiting',
                  style: const TextStyle(fontSize: 13, color: QuykColors.muted),
                ),
              ),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '~${_fmtMinutes(queue.averageServiceTimeMinutes)} min each',
                  style: const TextStyle(fontSize: 12, color: QuykColors.subtle),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => context.push(AppRoutes.queueConsole(queue.id)),
                  icon: const Icon(Icons.campaign_outlined, size: 18),
                  label: const Text('Serve guests'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.outlined(
                tooltip: 'Guest join code',
                onPressed: () => context.push(AppRoutes.restaurantQr),
                icon: const Icon(Icons.qr_code_2_rounded),
              ),
              const SizedBox(width: 4),
              IconButton.outlined(
                tooltip: 'Line settings',
                onPressed: () => context.push(AppRoutes.queueSettings(queue.id)),
                icon: const Icon(Icons.tune_rounded),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet to create a waiting line. Shows API errors inline.
Future<void> showCreateQueueSheet(BuildContext context, WidgetRef ref) async {
  final user = ref.read(currentUserProvider);
  if (user?.businessId == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Please sign in again, then create a waiting line.')),
    );
    return;
  }
  final List<BranchModel> branches;
  try {
    branches = await ref.read(branchesProvider.future);
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Couldn’t load your locations — ${apiExceptionMessage(e)}')),
      );
    }
    return;
  }
  if (!context.mounted) return;
  if (branches.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Add a location first, then create a waiting line.'),
        action: SnackBarAction(label: 'Add location', onPressed: () => context.push(AppRoutes.branchAdd)),
      ),
    );
    return;
  }
  final selected = ref.read(selectedBranchIdProvider);
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _CreateQueueSheet(
      businessId: user!.businessId!,
      branches: branches,
      initialBranchId: branches.any((b) => b.id == selected) ? selected! : branches.first.id,
    ),
  );
}

class _CreateQueueSheet extends ConsumerStatefulWidget {
  const _CreateQueueSheet({
    required this.businessId,
    required this.branches,
    required this.initialBranchId,
  });

  final String businessId;
  final List<BranchModel> branches;
  final String initialBranchId;

  @override
  ConsumerState<_CreateQueueSheet> createState() => _CreateQueueSheetState();
}

class _CreateQueueSheetState extends ConsumerState<_CreateQueueSheet> {
  final _name = TextEditingController();
  final _notes = TextEditingController();
  final _minutesPerGuest = TextEditingController(text: '10');
  late String _branchId = widget.initialBranchId;
  String _mode = 'DINE_IN';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    _minutesPerGuest.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Give the line a name.');
      return;
    }
    final minutes = int.tryParse(_minutesPerGuest.text.trim());
    if (minutes == null || minutes < 1) {
      setState(() => _error = 'Minutes per guest must be a whole number above 0.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final letter = name.replaceAll(RegExp('[^A-Za-z]'), '');
    try {
      await ref.read(businessApiClientProvider).createQueue({
        'businessId': widget.businessId,
        'branchId': _branchId,
        'name': name,
        'prefix': letter.isEmpty ? 'A' : letter[0].toUpperCase(),
        'serviceMode': _mode,
        'averageServiceTimeMinutes': minutes,
        if (_notes.text.trim().isNotEmpty) 'description': _notes.text.trim(),
      });
      ref.invalidate(queuesProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('“$name” is ready for guests')));
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'New waiting line',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green),
            ),
            const SizedBox(height: 4),
            const Text(
              'Guests join this line when they scan your code.',
              style: TextStyle(fontSize: 13, color: QuykColors.muted),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _name,
              autofocus: true,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Name', hintText: 'e.g. Dinner waitlist'),
            ),
            const SizedBox(height: 14),
            const Text('What is this line for?', style: TextStyle(fontSize: 13, color: QuykColors.muted)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: [
                for (final m in _modes) ButtonSegment(value: m.value, label: Text(m.label)),
              ],
              selected: {_mode},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _mode = s.first),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (widget.branches.length > 1) ...[
                  Expanded(
                    flex: 3,
                    child: DropdownButtonFormField<String>(
                      initialValue: _branchId,
                      decoration: const InputDecoration(labelText: 'Location'),
                      items: [
                        for (final b in widget.branches) DropdownMenuItem(value: b.id, child: Text(b.name)),
                      ],
                      onChanged: (v) => setState(() => _branchId = v ?? _branchId),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _minutesPerGuest,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Minutes per guest'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'Notes for your team (optional)'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              QuykAuthError(_error!),
            ],
            const SizedBox(height: 20),
            QuykAuthButton(label: 'Create line', loading: _saving, onPressed: _create),
          ],
        ),
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
    Future<void> refresh() async => ref.invalidate(queueSnapshotProvider(queueId));

    return async.when(
      loading: () => const QuykPage(title: 'Waiting line', back: true, children: [QuykLoadingBlock()]),
      error: (e, _) => QuykPage(
        title: 'Waiting line',
        back: true,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this line',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: refresh,
          ),
        ],
      ),
      data: (snapshot) {
        final queue = snapshot.queue;
        final info = ServiceModeInfo.forMode(queue.serviceMode);
        final waiting = snapshot.entries.where((e) => e.status == 'WAITING').length;
        final serving = snapshot.entries.where((e) => e.status == 'CALLED').length;
        final avgWait = snapshot.metrics.averageWaitMinutes;
        return QuykPage(
          title: queue.name,
          subtitle: '${info.label} · ${queueStatusLabel(queue.status)}',
          back: true,
          action: FilledButton.icon(
            onPressed: () => context.push(AppRoutes.queueConsole(queueId)),
            icon: const Icon(Icons.campaign_outlined, size: 18),
            label: const Text('Serve guests'),
          ),
          onRefresh: refresh,
          children: [
            QuykGrid(
              minTileWidth: 200,
              children: [
                QuykStatTile(label: 'Waiting now', value: '$waiting', icon: info.icon),
                QuykStatTile(label: 'Being served', value: '$serving', icon: Icons.room_service_outlined),
                QuykStatTile(
                  label: 'Average wait',
                  value: avgWait > 0 ? '$avgWait min' : '—',
                  icon: Icons.timer_outlined,
                ),
                QuykStatTile(
                  label: 'Per guest',
                  value: '${_fmtMinutes(queue.averageServiceTimeMinutes)} min',
                  icon: Icons.hourglass_bottom_rounded,
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (queue.description?.trim().isNotEmpty == true) ...[
              QuykCard(
                child: Text(queue.description!, style: const TextStyle(fontSize: 14, color: QuykColors.muted)),
              ),
              const SizedBox(height: 20),
            ],
            const QuykSectionTitle('Manage'),
            QuykGrid(
              minTileWidth: 280,
              children: [
                QuykActionTile(
                  icon: Icons.campaign_outlined,
                  title: 'Serve guests',
                  subtitle: serving > 0
                      ? '$serving being served · $waiting waiting'
                      : waiting > 0
                          ? '$waiting ${info.waitingUnitLabel(waiting)} waiting'
                          : 'Ready for the next guest',
                  onTap: () => context.push(AppRoutes.queueConsole(queueId)),
                ),
                QuykActionTile(
                  icon: Icons.tune_rounded,
                  title: 'Line settings',
                  subtitle: 'Name, time per guest, capacity',
                  onTap: () => context.push(AppRoutes.queueSettings(queueId)),
                ),
                QuykActionTile(
                  icon: Icons.qr_code_2_rounded,
                  title: 'Guest join code',
                  subtitle: info.scanInstruction,
                  onTap: () => context.push(AppRoutes.restaurantQr),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const QuykSectionTitle('Line status'),
            _StatusActions(queue: queue),
          ],
        );
      },
    );
  }
}

class _StatusActions extends ConsumerWidget {
  const _StatusActions({required this.queue});

  final QueueModel queue;

  Future<void> _run(BuildContext context, WidgetRef ref, String action) async {
    final info = ServiceModeInfo.forMode(queue.serviceMode);
    if (action == 'pause' &&
        !await confirmAction(
          context,
          title: 'Pause ${queue.name}?',
          message: 'Guests won’t be able to join until you resume it. Guests already waiting stay in line.',
          confirmLabel: 'Pause line',
        )) {
      return;
    }
    if (action == 'close' &&
        (!context.mounted ||
            !await confirmAction(
              context,
              title: 'Close ${queue.name}?',
              message: 'This stops the ${info.label.toLowerCase()} line for today. '
                  'Guests already waiting stay until you finish serving them.',
              confirmLabel: 'Close line',
              destructive: true,
            ))) {
      return;
    }
    if (!context.mounted) return;
    final api = ref.read(businessApiClientProvider);
    final ok = await runWithFeedback(
      context,
      () => switch (action) {
        'open' => api.openQueue(queue.id),
        'pause' => api.pauseQueue(queue.id),
        'resume' => api.resumeQueue(queue.id),
        _ => api.closeQueue(queue.id),
      },
      success: switch (action) {
        'open' => 'Line is open',
        'pause' => 'Line paused',
        'resume' => 'Line resumed',
        _ => 'Line closed',
      },
      failure: 'Couldn’t update the line',
    );
    if (ok) {
      ref
        ..invalidate(queueSnapshotProvider(queue.id))
        ..invalidate(queueDetailProvider(queue.id))
        ..invalidate(queuesProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = queue.status.toUpperCase();
    final actions = <(String, String, IconData)>[
      if (status == 'CLOSED' || status == 'ARCHIVED') ('open', 'Open line', Icons.play_arrow_rounded),
      if (status == 'ACTIVE') ('pause', 'Pause', Icons.pause_rounded),
      if (status == 'PAUSED') ('resume', 'Resume', Icons.play_arrow_rounded),
      if (status == 'ACTIVE' || status == 'PAUSED') ('close', 'Close for today', Icons.stop_circle_outlined),
    ];
    return QuykCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          queueStatusPill(queue.status),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              switch (status) {
                'ACTIVE' => 'Guests can join right now.',
                'PAUSED' => 'Joining is paused. Guests in line keep their place.',
                _ => 'This line isn’t taking guests.',
              },
              style: const TextStyle(fontSize: 13, color: QuykColors.muted),
            ),
          ),
          Wrap(
            spacing: 8,
            children: [
              for (final (action, label, icon) in actions)
                OutlinedButton.icon(
                  onPressed: () => _run(context, ref, action),
                  icon: Icon(icon, size: 18),
                  label: Text(label),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class QueueSettingsScreen extends ConsumerWidget {
  const QueueSettingsScreen({super.key, required this.queueId});

  final String queueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(queueDetailProvider(queueId));
    return async.when(
      loading: () => const QuykPage(title: 'Line settings', back: true, children: [QuykLoadingBlock()]),
      error: (e, _) => QuykPage(
        title: 'Line settings',
        back: true,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this line’s settings',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: () => ref.invalidate(queueDetailProvider(queueId)),
          ),
        ],
      ),
      data: (queue) => _QueueSettingsForm(key: ValueKey(queue.id), queue: queue),
    );
  }
}

class _QueueSettingsForm extends ConsumerStatefulWidget {
  const _QueueSettingsForm({super.key, required this.queue});

  final QueueModel queue;

  @override
  ConsumerState<_QueueSettingsForm> createState() => _QueueSettingsFormState();
}

class _QueueSettingsFormState extends ConsumerState<_QueueSettingsForm> {
  late final _name = TextEditingController(text: widget.queue.name);
  late final _notes = TextEditingController(text: widget.queue.description ?? '');
  late final _minutes = TextEditingController(text: widget.queue.averageServiceTimeMinutes.round().toString());
  late final _capacity = TextEditingController(text: widget.queue.maxCapacity?.toString() ?? '');
  late bool _priority = widget.queue.priorityEnabled;
  late bool _accepting = widget.queue.isAcceptingEntries;
  late String _mode = widget.queue.serviceMode;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    _minutes.dispose();
    _capacity.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final minutes = int.tryParse(_minutes.text.trim());
    final capacityText = _capacity.text.trim();
    final capacity = capacityText.isEmpty ? null : int.tryParse(capacityText);
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'The line needs a name.');
      return;
    }
    if (minutes == null || minutes < 1) {
      setState(() => _error = 'Minutes per guest must be a whole number above 0.');
      return;
    }
    if (capacityText.isNotEmpty && (capacity == null || capacity < 1)) {
      setState(() => _error = 'Capacity must be a whole number above 0, or left empty for no limit.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(businessApiClientProvider).updateQueue(widget.queue.id, {
        'name': _name.text.trim(),
        'description': _notes.text.trim(),
        'averageServiceTimeMinutes': minutes,
        'maxCapacity': capacity,
        'priorityEnabled': _priority,
        'isAcceptingEntries': _accepting,
        'serviceMode': _mode,
      });
      ref
        ..invalidate(queueDetailProvider(widget.queue.id))
        ..invalidate(queueSnapshotProvider(widget.queue.id))
        ..invalidate(queuesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Line settings saved')));
      if (context.canPop()) context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = apiExceptionMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return QuykPage(
      title: 'Line settings',
      subtitle: widget.queue.name,
      back: true,
      maxWidth: 720,
      children: [
        QuykCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
              const SizedBox(height: 14),
              TextField(
                controller: _notes,
                decoration: const InputDecoration(labelText: 'Notes for your team (optional)'),
              ),
              const SizedBox(height: 14),
              const Text('What is this line for?', style: TextStyle(fontSize: 13, color: QuykColors.muted)),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: [
                  for (final m in _modes) ButtonSegment(value: m.value, label: Text(m.label)),
                ],
                selected: {_mode},
                showSelectedIcon: false,
                onSelectionChanged: (s) => setState(() => _mode = s.first),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _minutes,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Minutes per guest',
                        helperText: 'Used to estimate wait times',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _capacity,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Max guests in line',
                        helperText: 'Leave empty for no limit',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        QuykCard(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Accepting new guests'),
                subtitle: const Text('Turn off to stop new joins without pausing the line'),
                value: _accepting,
                onChanged: (v) => setState(() => _accepting = v),
              ),
              const Divider(indent: 16, endIndent: 16),
              SwitchListTile(
                title: const Text('Priority guests first'),
                subtitle: const Text('VIP and priority guests are called before others'),
                value: _priority,
                onChanged: (v) => setState(() => _priority = v),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          QuykAuthError(_error!),
        ],
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerLeft,
          child: SizedBox(
            width: 240,
            child: QuykAuthButton(label: 'Save changes', loading: _saving, onPressed: _save),
          ),
        ),
      ],
    );
  }
}
