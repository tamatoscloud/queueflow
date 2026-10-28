import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:queueflow_theme/queueflow_theme.dart';
import 'package:queueflow_ui/queueflow_ui.dart';

import '../../../core/models/models.dart';
import '../../../core/network/business_api_client.dart';
import '../../../core/network/connection_diagnostics.dart' show apiExceptionMessage;
import '../../../core/realtime/realtime_client.dart';
import '../../../core/realtime/realtime_sync.dart';
import '../../../core/routing/app_routes.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/feedback.dart';
import '../../../shared/service_mode/service_mode_helpers.dart';
import '../../../shared/widgets/queue_join_qr_sheet.dart';
import '../../queues/presentation/queues_screen.dart';

final queueSnapshotProvider = FutureProvider.autoDispose.family<QueueSnapshotModel, String>((ref, queueId) async {
  return ref.watch(businessApiClientProvider).getQueueSnapshot(queueId);
});

final queueConsoleRealtimeBindingProvider = Provider.autoDispose.family<void, String>((ref, queueId) {
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
  );
});

int? _minutesSince(DateTime? t) => t == null ? null : DateTime.now().difference(t.toLocal()).inMinutes.clamp(0, 9999);

/// Owner / manager "Serve guests" console: the same live board the staff app
/// uses, plus the full waiting list with per-guest actions.
class QueueConsoleScreen extends ConsumerStatefulWidget {
  const QueueConsoleScreen({super.key, required this.queueId});

  final String queueId;

  @override
  ConsumerState<QueueConsoleScreen> createState() => _QueueConsoleScreenState();
}

class _QueueConsoleScreenState extends ConsumerState<QueueConsoleScreen> {
  final _listKey = GlobalKey();
  bool _calling = false;

  String get _id => widget.queueId;

  Future<void> _refresh() async => ref.invalidate(queueSnapshotProvider(_id));

  Future<void> _callNext(QueueEntryModel? called) async {
    if (_calling) return;
    setState(() => _calling = true);
    final api = ref.read(businessApiClientProvider);
    await runWithFeedback(
      context,
      () async {
        if (called != null) await api.completeEntry(called.id);
        await api.callNext(_id);
      },
      failure: called != null ? 'Couldn’t finish and call the next guest' : 'Couldn’t call the next guest',
    );
    if (mounted) setState(() => _calling = false);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(queueConsoleRealtimeBindingProvider(_id));
    final async = ref.watch(queueSnapshotProvider(_id));
    final queues = ref.watch(queuesProvider).valueOrNull ?? const <QueueModel>[];
    final live = ref.watch(realtimeStatusProvider).valueOrNull == RealtimeStatus.connected;

    return async.when(
      loading: () => const QuykPage(title: 'Serve guests', back: true, children: [QuykLoadingBlock()]),
      error: (e, _) => QuykPage(
        title: 'Serve guests',
        back: true,
        children: [
          QuykMessageCard(
            icon: Icons.cloud_off_rounded,
            title: 'We couldn’t load this waiting line',
            subtitle: apiExceptionMessage(e),
            actionLabel: 'Try again',
            onAction: _refresh,
          ),
        ],
      ),
      data: (snapshot) {
        final queue = snapshot.queue;
        final info = ServiceModeInfo.forMode(queue.serviceMode);
        final called = snapshot.currentCalled;
        final waiting = snapshot.entries.where((e) => e.status == 'WAITING').toList();
        final holding = snapshot.entries.where((e) => e.status == 'HOLDING').toList();
        final hero = called ?? (waiting.isEmpty ? null : waiting.first);
        final avgWait = snapshot.metrics.averageWaitMinutes;

        return QuykPage(
          title: queue.name,
          subtitle: '${info.label} · ${queueStatusLabel(queue.status)}${live ? '' : ' · reconnecting…'}',
          back: true,
          onRefresh: _refresh,
          action: OutlinedButton.icon(
            onPressed: () => showQueueJoinQrSheet(context, queueId: _id, queueName: queue.name),
            icon: const Icon(Icons.qr_code_2_rounded, size: 18),
            label: const Text('Guest code'),
          ),
          children: [
            if (!queue.isActive) ...[
              _ClosedNotice(queue: queue),
              const SizedBox(height: 16),
            ],
            LiveQueueBoard(
              waitingCount: waiting.length + holding.length,
              heroBadge: called != null ? 'Being served' : "Who's next",
              heroLineLabel: '${info.label} · ${queue.name}',
              heroMessage: hero == null ? 'No one is waiting. New guests appear here as they join.' : null,
              hero: hero == null
                  ? null
                  : LiveBoardGuest(
                      displayCode: hero.displayCode.isNotEmpty ? hero.displayCode : '—',
                      name: hero.customerName ?? 'Guest',
                      phone: hero.customerPhone,
                      contextLabel: hero.partySize > 1 ? 'Party of ${hero.partySize}' : null,
                      waitingMinutes: _minutesSince(hero.joinedAt),
                      estimatedMinutes: called == null && avgWait > 0 ? avgWait.toDouble() : null,
                    ),
              lines: [
                for (final q in queues)
                  LiveBoardLine(
                    id: q.id,
                    name: q.name,
                    serviceMode: q.serviceMode,
                    waiting: q.waitingCount,
                    selected: q.id == _id,
                  ),
              ],
              callLabel: called != null ? 'Done — call next guest' : 'Call next guest',
              callBusy: _calling,
              onCallNext: (called == null && waiting.isEmpty) ? null : () => _callNext(called),
              onHold: hero == null ? null : () => _entryAction(hero, 'hold'),
              onSkip: hero == null ? null : () => _entryAction(hero, 'skip'),
              onMove: hero == null || queues.length < 2 ? null : () => _move(hero, queues),
              onWalkIn: () => _walkIn(queue),
              onFullList: () {
                final ctx = _listKey.currentContext;
                if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 300));
              },
              onSelectLine: (id) {
                if (id != _id) context.pushReplacement(AppRoutes.queueConsole(id));
              },
            ),
            const SizedBox(height: 28),
            QuykSectionTitle(
              'Waiting list · ${waiting.length + holding.length}',
              key: _listKey,
            ),
            if (waiting.isEmpty && holding.isEmpty)
              const QuykMessageCard(
                icon: Icons.event_seat_outlined,
                title: 'Nobody is waiting',
                subtitle: 'Guests who scan your code — or walk-ins you add — show up here.',
              )
            else
              QuykTable(
                columns: const [
                  QuykColumn('Ticket', flex: 2),
                  QuykColumn('Guest', flex: 4),
                  QuykColumn('Party', flex: 1),
                  QuykColumn('Waiting', flex: 2),
                  QuykColumn('Status', flex: 2),
                  QuykColumn('', flex: 4, alignEnd: true),
                ],
                rows: [
                  for (final e in [...waiting, ...holding])
                    [
                      QuykCellText(e.displayCode, strong: true, green: true),
                      QuykCellText(
                        [e.customerName ?? 'Guest', if (e.isVip) '★ VIP'].join(' '),
                        strong: true,
                      ),
                      QuykCellText('${e.partySize}'),
                      QuykCellText(_minutesSince(e.joinedAt) == null ? '—' : '${_minutesSince(e.joinedAt)} min'),
                      QuykStatusPill(status: e.status),
                      Wrap(
                        spacing: 4,
                        children: [
                          if (e.status == 'HOLDING')
                            TextButton(onPressed: () => _entryAction(e, 'resume'), child: const Text('Resume'))
                          else
                            TextButton(onPressed: () => _entryAction(e, 'hold'), child: const Text('Hold')),
                          PopupMenuButton<String>(
                            tooltip: 'More actions',
                            icon: const Icon(Icons.more_horiz_rounded, color: QuykColors.muted),
                            onSelected: (a) => a == 'transfer' ? _move(e, queues) : _entryAction(e, a),
                            itemBuilder: (_) => [
                              if (!e.isVip) const PopupMenuItem(value: 'priority', child: Text('Move to front (priority)')),
                              if (queues.length > 1) const PopupMenuItem(value: 'transfer', child: Text('Move to another line')),
                              const PopupMenuItem(value: 'skip', child: Text('Skip')),
                              const PopupMenuItem(
                                value: 'cancel',
                                child: Text('Remove from line', style: TextStyle(color: QuykColors.danger)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                ],
              ),
          ],
        );
      },
    );
  }

  Future<void> _entryAction(QueueEntryModel e, String action) async {
    final name = e.customerName ?? 'this guest';
    if (action == 'skip' &&
        !await confirmAction(
          context,
          title: 'Skip ${e.displayCode}?',
          message: '$name will be taken out of the line. Use Hold instead if they just stepped away.',
          confirmLabel: 'Skip guest',
          destructive: true,
        )) {
      return;
    }
    if (action == 'cancel' &&
        (!mounted ||
            !await confirmAction(
              context,
              title: 'Remove ${e.displayCode}?',
              message: '$name will be removed from the line.',
              confirmLabel: 'Remove',
              destructive: true,
            ))) {
      return;
    }
    if (!mounted) return;
    final api = ref.read(businessApiClientProvider);
    await runWithFeedback(
      context,
      () => switch (action) {
        'hold' => api.holdEntry(e.id),
        'resume' => api.resumeHeld(e.id),
        'skip' => api.skipEntry(e.id),
        'recall' => api.recallEntry(e.id),
        'complete' => api.completeEntry(e.id),
        'cancel' => api.cancelEntry(e.id),
        'priority' => api.setPriority(e.id, 10),
        _ => Future<void>.value(),
      },
      success: switch (action) {
        'hold' => '${e.displayCode} on hold',
        'resume' => '${e.displayCode} back in line',
        'skip' => '${e.displayCode} skipped',
        'cancel' => '${e.displayCode} removed',
        'priority' => '${e.displayCode} moved to the front',
        _ => null,
      },
      failure: 'Couldn’t update ${e.displayCode}',
    );
    await _refresh();
  }

  Future<void> _move(QueueEntryModel e, List<QueueModel> queues) async {
    final targets = queues.where((q) => q.id != _id).toList();
    if (targets.isEmpty) return;
    final target = await showModalBottomSheet<QueueModel>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: Text(
                'Move ${e.displayCode} to…',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: QuykColors.green),
              ),
            ),
            for (final q in targets)
              ListTile(
                leading: Icon(ServiceModeInfo.forMode(q.serviceMode).icon),
                title: Text(q.name),
                subtitle: Text('${q.waitingCount} waiting'),
                onTap: () => Navigator.pop(ctx, q),
              ),
          ],
        ),
      ),
    );
    if (target == null || !mounted) return;
    await runWithFeedback(
      context,
      () => ref.read(businessApiClientProvider).transferEntry(e.id, target.id),
      success: '${e.displayCode} moved to ${target.name}',
      failure: 'Couldn’t move ${e.displayCode}',
    );
    ref.invalidate(queuesProvider);
    await _refresh();
  }

  Future<void> _walkIn(QueueModel queue) async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _WalkInSheet(queueId: queue.id, queueName: queue.name),
    );
    if (added == true) await _refresh();
  }
}

class _ClosedNotice extends StatelessWidget {
  const _ClosedNotice({required this.queue});

  final QueueModel queue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(color: QuykColors.warningTint, borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFF7A4B0C)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              queue.isPaused
                  ? 'This line is paused — new guests can’t join, but you can keep serving.'
                  : 'This line is closed — open it from the line page to take guests.',
              style: const TextStyle(fontSize: 13.5, color: QuykColors.ink),
            ),
          ),
          TextButton(
            onPressed: () => context.push(AppRoutes.queueDetail(queue.id)),
            child: const Text('Line status'),
          ),
        ],
      ),
    );
  }
}

class _WalkInSheet extends ConsumerStatefulWidget {
  const _WalkInSheet({required this.queueId, required this.queueName});

  final String queueId;
  final String queueName;

  @override
  ConsumerState<_WalkInSheet> createState() => _WalkInSheetState();
}

class _WalkInSheetState extends ConsumerState<_WalkInSheet> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  int _party = 2;
  String _channel = 'WHATSAPP';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final name = _name.text.trim();
    final phone = _phone.text.trim();
    if (name.isEmpty || phone.isEmpty) {
      setState(() => _error = 'Add the guest’s name and phone so we can tell them when it’s their turn.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final entry = await ref.read(businessApiClientProvider).walkIn(widget.queueId, {
        'fullName': name,
        'phone': phone,
        'partySize': _party,
        'notificationPreference': _channel,
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$name added as ${entry.displayCode}')),
      );
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
              'Add a walk-in guest',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: QuykColors.green),
            ),
            const SizedBox(height: 4),
            Text('They’ll join ${widget.queueName}.', style: const TextStyle(fontSize: 13, color: QuykColors.muted)),
            const SizedBox(height: 20),
            TextField(
              controller: _name,
              autofocus: true,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone', hintText: 'For their “your turn” alert'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Party size', style: TextStyle(fontSize: 14, color: QuykColors.ink)),
                const Spacer(),
                IconButton.outlined(
                  onPressed: _party > 1 ? () => setState(() => _party--) : null,
                  icon: const Icon(Icons.remove_rounded),
                ),
                SizedBox(
                  width: 44,
                  child: Text(
                    '$_party',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                ),
                IconButton.outlined(
                  onPressed: _party < 30 ? () => setState(() => _party++) : null,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'WHATSAPP', label: Text('WhatsApp')),
                ButtonSegment(value: 'SMS', label: Text('SMS')),
                ButtonSegment(value: 'BOTH', label: Text('Both')),
              ],
              selected: {_channel},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _channel = s.first),
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              QuykAuthError(_error!),
            ],
            const SizedBox(height: 20),
            QuykAuthButton(label: 'Add to line', loading: _saving, onPressed: _add),
          ],
        ),
      ),
    );
  }
}
